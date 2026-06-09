import argparse
import contextlib
import inspect
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve x64dbg MCP over HTTP")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8877)
    parser.add_argument("--path", default="/mcp")
    parser.add_argument(
        "--upstream-url",
        default="http://127.0.0.1:8888/",
        help="HTTP endpoint exposed by the x64dbg plugin",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    sys.path.insert(0, str(root / "src"))

    import x64dbg

    x64dbg.set_x64dbg_server_url(args.upstream_url)
    run_params = inspect.signature(x64dbg.mcp.run).parameters

    transport_security = getattr(x64dbg.mcp.settings, "transport_security", None)
    if transport_security and getattr(
        transport_security,
        "enable_dns_rebinding_protection",
        False,
    ):
        allowed_origins = list(getattr(transport_security, "allowed_origins", []))
        for origin in (
            "http://tauri.localhost",
            "http://tauri.localhost:*",
            "https://tauri.localhost",
            "https://tauri.localhost:*",
            "tauri://localhost",
        ):
            if origin not in allowed_origins:
                allowed_origins.append(origin)
        transport_security.allowed_origins = allowed_origins

    if hasattr(x64dbg.mcp, "streamable_http_app"):
        from starlette.middleware.cors import CORSMiddleware
        import uvicorn

        x64dbg.mcp.settings.host = args.host
        x64dbg.mcp.settings.port = args.port
        x64dbg.mcp.settings.streamable_http_path = args.path

        mcp_app = x64dbg.mcp.streamable_http_app()

        @contextlib.asynccontextmanager
        async def lifespan(_app):
            async with x64dbg.mcp.session_manager.run():
                yield

        mcp_app.router.lifespan_context = lifespan
        app = CORSMiddleware(
            mcp_app,
            allow_origins=["*"],
            allow_methods=["GET", "POST", "DELETE"],
            allow_headers=["*"],
            expose_headers=["Mcp-Session-Id"],
        )
        uvicorn.run(app, host=args.host, port=args.port)
        return

    # Support both the older FastMCP HTTP signature used by the upstream
    # project and the current MCP Python SDK API, which configures host/port
    # on the FastMCP instance and uses `streamable-http` at run time.
    if {"host", "port", "path"}.issubset(run_params):
        x64dbg.mcp.run(
            transport="http",
            host=args.host,
            port=args.port,
            path=args.path,
        )
        return

    x64dbg.mcp.settings.host = args.host
    x64dbg.mcp.settings.port = args.port
    x64dbg.mcp.settings.streamable_http_path = args.path
    x64dbg.mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()

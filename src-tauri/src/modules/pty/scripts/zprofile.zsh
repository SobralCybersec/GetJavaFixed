# javarf-shell-integration (zprofile)
#
# See zshenv.zsh for the rationale on the trailing `:`.
{
  _javarf_user_zdotdir="${JAVARF_USER_ZDOTDIR:-$HOME}"
  [ -f "$_javarf_user_zdotdir/.zprofile" ] && source "$_javarf_user_zdotdir/.zprofile"
  unset _javarf_user_zdotdir
}
:

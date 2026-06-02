; "Open in JavaRf" shell verbs for folders, folder backgrounds, and drives.
; HKCU matches installer currentUser scope. %V = clicked path.
; NoWorkingDirectory keeps Explorer from overriding %V (System32 on Drive).

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInJavaRf" "" "Open in JavaRf"
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInJavaRf" "Icon" '"$INSTDIR\javarf.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInJavaRf" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInJavaRf\command" "" '"$INSTDIR\javarf.exe" "%V"'

  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInJavaRf" "" "Open in JavaRf"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInJavaRf" "Icon" '"$INSTDIR\javarf.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInJavaRf" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInJavaRf\command" "" '"$INSTDIR\javarf.exe" "%V"'

  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInJavaRf" "" "Open in JavaRf"
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInJavaRf" "Icon" '"$INSTDIR\javarf.exe",0'
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInJavaRf" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInJavaRf\command" "" '"$INSTDIR\javarf.exe" "%V"'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\Directory\shell\OpenInJavaRf"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\OpenInJavaRf"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\OpenInJavaRf"
!macroend

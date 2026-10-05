[Setup]
AppName=Double79 Game Store
AppVersion=1.0
AppPublisher=Double79
DefaultDirName={autopf}\Double79 Game Store
DefaultGroupName=Double79 Game Store
OutputDir=Output
OutputBaseFilename=Double79-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
WizardStyle=modern

[Files]
Source: "dist\Double79GameStore.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Double79 Game Store"; Filename: "{app}\Double79GameStore.exe"
Name: "{userdesktop}\Double79 Game Store"; Filename: "{app}\Double79GameStore.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"

[Run]
Filename: "{app}\Double79GameStore.exe"; Description: "Launch Double79 Game Store"; Flags: nowait postinstall skipifsilent

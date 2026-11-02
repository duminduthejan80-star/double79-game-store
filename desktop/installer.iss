; Inno Setup script for the Double79 Game Store PC app
#define AppName "Double79 Game Store"
#define AppVersion "3.0.0"

[Setup]
AppId={{D79A0001-549d-4aab-a7e6-DOUBLE79STORE}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={autopf}\Double79 Game Store
DefaultGroupName={#AppName}
OutputDir=..\dist
OutputBaseFilename=Double79_Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern

[Files]
Source: "..\dist\Double79GameStore.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "bin\UnRAR.exe"; DestDir: "{app}"; Flags: ignoreversion skipifdoesntexist

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\Double79GameStore.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\Double79GameStore.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\Double79GameStore.exe"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent

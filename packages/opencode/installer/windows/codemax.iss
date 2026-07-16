#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif
#ifndef MySourceDir
  #define MySourceDir "..\..\dist\codemax-windows-x64\bin"
#endif

[Setup]
AppId={{9E2F9D7B-BCB4-4D19-B641-6A5CDFA4C052}
AppName=CodeMax
AppVersion={#MyAppVersion}
AppPublisher=CodeMax
AppPublisherURL=https://github.com/anomalyco/opencode
DefaultDirName={localappdata}\Programs\CodeMax
DefaultGroupName=CodeMax
OutputDir=..\..\dist\release
OutputBaseFilename=CodeMax-Setup-x64
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
Compression=lzma2
SolidCompression=yes
UninstallDisplayIcon={app}\codemax.exe

[Tasks]
Name: "addtopath"; Description: "Add CodeMax to the user PATH"; Flags: checked
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked

[Files]
Source: "{#MySourceDir}\codemax.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\CodeMax"; Filename: "wt.exe"; Parameters: "-d ""{userprofile}"" cmd /k """"{app}\codemax.exe"""""; Check: HasWindowsTerminal
Name: "{group}\CodeMax"; Filename: "{cmd}"; Parameters: "/k """"{app}\codemax.exe"""""; Check: not HasWindowsTerminal
Name: "{autodesktop}\CodeMax"; Filename: "{app}\codemax.exe"; Tasks: desktopicon

[Code]
const
  EnvironmentKey = 'Environment';
  PathName = 'Path';
  UserDataFlag = '/DELETEUSERDATA';

function HasWindowsTerminal: Boolean;
begin
  Result := FileExists(ExpandConstant('{localappdata}\Microsoft\WindowsApps\wt.exe')) or FileExists(ExpandConstant('{sys}\wt.exe'));
end;

function NormalizePath(Value: String): String;
begin
  Result := RemoveBackslashUnlessRoot(Lowercase(Value));
end;

function PathContains(Value, Segment: String): Boolean;
begin
  Result := Pos(';' + NormalizePath(Segment) + ';', ';' + Lowercase(Value) + ';') > 0;
end;

procedure BroadcastEnvironmentChange;
var
  ResultCode: DWORD;
begin
  SendMessageTimeout(HWND_BROADCAST, WM_SETTINGCHANGE, 0, 'Environment', SMTO_ABORTIFHUNG, 5000, ResultCode);
end;

procedure AddUserPath;
var
  Existing: String;
begin
  RegQueryStringValue(HKCU, EnvironmentKey, PathName, Existing);
  if PathContains(Existing, ExpandConstant('{app}')) then exit;
  if Existing = '' then Existing := ExpandConstant('{app}') else Existing := Existing + ';' + ExpandConstant('{app}');
  RegWriteStringValue(HKCU, EnvironmentKey, PathName, Existing);
  BroadcastEnvironmentChange;
end;

procedure RemoveUserPath;
var
  Existing: String;
  Needle: String;
begin
  if not RegQueryStringValue(HKCU, EnvironmentKey, PathName, Existing) then exit;
  Needle := NormalizePath(ExpandConstant('{app}'));
  StringChangeEx(Existing, ';' + Needle + ';', ';', True);
  StringChangeEx(Existing, Needle + ';', '', True);
  StringChangeEx(Existing, ';' + Needle, '', True);
  if NormalizePath(Existing) = Needle then Existing := '';
  RegWriteStringValue(HKCU, EnvironmentKey, PathName, Existing);
  BroadcastEnvironmentChange;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and WizardIsTaskSelected('addtopath') then AddUserPath;
end;

function IsApprovedCodeMaxPath(Value: String): Boolean;
begin
  Result := CompareText(RemoveBackslashUnlessRoot(Value), RemoveBackslashUnlessRoot(ExpandConstant('{userappdata}\CodeMax'))) = 0;
  if Result then exit;
  Result := CompareText(RemoveBackslashUnlessRoot(Value), RemoveBackslashUnlessRoot(ExpandConstant('{localappdata}\CodeMax'))) = 0;
end;

procedure DeleteCodeMaxUserData;
var
  Candidate: String;
begin
  Candidate := ExpandConstant('{userappdata}\CodeMax');
  if IsApprovedCodeMaxPath(Candidate) then DelTree(Candidate, True, True, True);
  Candidate := ExpandConstant('{localappdata}\CodeMax');
  if IsApprovedCodeMaxPath(Candidate) then DelTree(Candidate, True, True, True);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep <> usPostUninstall then exit;
  RemoveUserPath;
  if IsUninstallerCommandLineParam(UserDataFlag) then DeleteCodeMaxUserData;
end;

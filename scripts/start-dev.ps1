Set-Location D:\Coding\quran-teacher-app
$env:PATH = "C:\Users\hmzam\AppData\Roaming\npm;$env:PATH"
npx next dev --port 3000 2>&1 | Out-File .next/dev-server.log -Encoding utf8

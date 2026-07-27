# EXOTIC Operations Console v1.1

This console is installed by the root `Integrate-EXOTIC-Console.ps1` script. It includes Demo mode and Live mode backed by the native C++ adapter.

## Development launch

```powershell
npm install
$env:EXOTIC_WORKSPACE = 'C:\\Projects\\Exotic'
npm run desktop
```

## Browser-only launch

```powershell
node scripts/serve.mjs
```

## Package Windows

```powershell
npm run package:win
```

The desktop wrapper expects `native/exotic-console-api.exe` and `native/exotic-runtime-smoke.exe`, which the integration script copies after the MSVC build.

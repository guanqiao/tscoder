@echo off

echo Building tscoder core functionality with TypeScript compiler...

:: Create dist directory
if not exist "dist" mkdir "dist"
if not exist "dist\bin" mkdir "dist\bin"

:: Compile TypeScript files
echo Compiling TypeScript files...
npm exec tsc -- --project tsconfig.json --outDir dist/bin

:: Copy package.json and bin script
echo Copying configuration files...
copy "package.json" "dist\package.json" > nul
copy "bin\tscoder" "dist\bin\tscoder" > nul

:: Create a simple entry point
echo Creating entry point...
echo @#!/usr/bin/env node > "dist\bin\index.js"
echo require('./index.js'); >> "dist\bin\index.js"

echo Core build completed successfully!
echo Build artifacts in: dist

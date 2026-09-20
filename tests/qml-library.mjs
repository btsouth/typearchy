// The engines are QML library scripts: no ESM syntax, and other libraries arrive through
// `.import "File.js" as Name`. QML resolves those by filename from the script's own directory, and
// this loads one the same way so a test can compare the original with the generated browser copy.

import fs from 'node:fs';
import vm from 'node:vm';

const sandboxGlobals = { console, Date, Math, JSON, Array, String, Number, isFinite };

export const sandboxNames = new Set(Object.keys(sandboxGlobals));

export function loadQmlLibrary(url, imported = []) {
  const source = fs.readFileSync(url, 'utf8').replace(/^\.pragma library\s*/, '');
  const library = { ...sandboxGlobals };
  vm.createContext(library);
  const executable = source.replace(/^\.import "([^"\n]+)" as (\w+)\s*$/gm, (_match, file, name) => {
    library[name] = loadQmlLibrary(new URL(file, url), imported);
    imported.push(name);
    return '';
  });
  vm.runInContext(executable, library);
  return library;
}

// Everything the script itself declares, without the injected globals and imported libraries.
export function declaredNames(library, imported = []) {
  return Object.keys(library).filter((name) => !sandboxNames.has(name) && !imported.includes(name));
}

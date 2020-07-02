import { bigtestGlobals } from '@bigtest/globals';
import { Operation } from 'effection';
import { once } from '@effection/events';
import { Mailbox } from '@bigtest/effection';
import { Bundler } from '@bigtest/bundler';
import { Atom } from '@bigtest/atom';
import { createFingerprint } from 'fprint';

import * as path from 'path';
import * as fs from 'fs';

import { Test } from '@bigtest/suite';

import { OrchestratorState } from './orchestrator/state';

const { copyFile, mkdir, truncate } = fs.promises;

interface ManifestBuilderOptions {
  delegate: Mailbox;
  atom: Atom<OrchestratorState>;
  srcPath: string;
  buildDir: string;
  distDir: string;
};

export function* updateSourceMapURL(filePath: string, sourcemapName: string): Operation{
  let { size } = fs.statSync(filePath);
  let readStream = fs.createReadStream(filePath, {start: size - 16});
  let [currentURL]: [Buffer] = yield once(readStream, 'data');

  if (currentURL.toString().trim().match(/manifest\.js\.map$/)) {
    yield truncate(filePath, size - 16);
    fs.appendFileSync(filePath, sourcemapName);
  } else {
    throw new Error(`Expected a sourcemapping near the end of the generated test bundle, but found "${currentURL}" instead.`);
  };
}

function* processManifest(options: ManifestBuilderOptions): Operation {
  let buildPath = path.resolve(options.buildDir, 'manifest.js');
  let sourcemapDir = path.resolve(options.buildDir, 'manifest.js.map');
  let fingerprint = yield createFingerprint(buildPath, 'sha256');
  let fileName = `manifest-${fingerprint}.js`;
  let sourcemapName = `${fileName}.map`;
  let distPath = path.resolve(options.distDir, fileName);
  let mapPath = path.resolve(options.distDir, sourcemapName);

  yield mkdir(path.dirname(distPath), { recursive: true });
  yield copyFile(buildPath, distPath);
  yield copyFile(sourcemapDir, mapPath);
  yield updateSourceMapURL(distPath, sourcemapName);

  let manifest = yield import(distPath);

  manifest = manifest.default || manifest;

  manifest.fileName = fileName;


  let slice = options.atom.slice<Test>(['manifest']);
  slice.set(manifest as Test);

  return distPath;
}

function* handleErrors(bundler: Bundler, delegate: Mailbox): Operation {
  let message = yield bundler.receive();

  if (message.type === "error") {
    console.error("[manifest builder] build error:", message.error.message);
    delegate.send({ event: "error" });
    yield handleErrors(bundler, delegate);
  }
}

export function* createManifestBuilder(options: ManifestBuilderOptions): Operation {
  let distPath: string;
  let bundler: Bundler = yield Bundler.create(
    [{
      entry: options.srcPath,
      globalName: bigtestGlobals.manifestProperty,
      outFile: path.join(options.buildDir, "manifest.js")
    }]
  );

  yield handleErrors(bundler, options.delegate);
  distPath = yield processManifest(options);
  console.debug("[manifest builder] manifest ready");
  options.delegate.send({ status: "ready", path: distPath });

  while(true) {
    yield handleErrors(bundler, options.delegate);
    let distPath = yield processManifest(options);

    console.debug("[manifest builder] manifest updated");
    options.delegate.send({ event: "update", path: distPath });
  }
}

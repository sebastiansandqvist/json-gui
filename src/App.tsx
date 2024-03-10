/* {
  playerHeight: 10,
  playerWidth: 4,
  playerBgColor: '#ff0000',
} */

import { Component, For, Setter, Show, Suspense, createResource, createSignal } from "solid-js";


const Sidebar: Component<{
  currentFile?: FileSystemFileHandle;
  setCurrentFile: Setter<FileSystemFileHandle | undefined>;
}> = (props) => {
  const [jsonFileHandles, setJsonFileHandles] = createSignal<FileSystemFileHandle[]>([]);
  return (
    <aside class="flex flex-col justify-between w-64 p-4 bg-zinc-800 h-full">
      <nav class="grid justify-start">
        <For each={jsonFileHandles()}>
          {(handle) => (
            <button
              class="text-left"
              disabled={props.currentFile === handle}
              classList={{
                'opacity-50 cursor-pointer': props.currentFile !== handle
              }}
              onclick={[props.setCurrentFile, handle]}>
              {handle.name}
            </button>
          )}
        </For>
      </nav>
      <button
        class="bg-emerald-600 px-2 py-1 cursor-pointer"
        onclick={async () => {
          const folder = await window.showDirectoryPicker();
          for await (const handle of folder.values()) {
            if (handle.kind === 'file' && handle.name.toLowerCase().endsWith('.json')) {
              console.log(handle.name);
              setJsonFileHandles((prev) => prev.concat(handle))
            }
          }
        }}>
        open JSON file
      </button>
    </aside>
  )
}

const Editor: Component<{ currentFile: FileSystemFileHandle }> = (props) => {
  const [contents] = createResource(async () => {
    const file = await props.currentFile.getFile();
    return await file.text();
  });

  return (
    <Suspense fallback={<textarea class="w-full" value="Loading..." />}>
      <textarea class="w-full" value={contents()} />
    </Suspense>
  );
}

function App() {
  const [currentFile, setCurrentFile] = createSignal<FileSystemFileHandle>();
  return (
    <div class="flex h-full">
      <Sidebar currentFile={currentFile()} setCurrentFile={setCurrentFile} />
      <Show when={currentFile()} keyed>
        {(file) => <Editor currentFile={file} />}
      </Show>
    </div>
  );
}

export default App

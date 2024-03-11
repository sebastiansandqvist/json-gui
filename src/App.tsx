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

function parseJsonFile(inputJson: string) {
  const json = JSON.parse(inputJson);
  return Object.entries(json).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number'
  );
}

/*
TODO:
  <Switch fallback={<StringField {...props} />}>
    <Match when={typeof value === number}>
      <NumberField {...props} />
    </Match>
    <Match when={colorRegex matches value}>
      <ColorField {...props} />
    </Match>
    ...
  </Switch>

  const NumberField: Component = () => {}
  const StringField: Component = () => {}

  // needs to track color format of input (hex, hsl, rgb, etc.)
  // then write the color in that same format. maybe internally
  // ColorField could have a <Switch> to match on each format,
  // so HSL(A) could get HSL sliders, RGB could have different
  // sliders?
  const ColorField: Component = () => {}
*/

const Editor: Component<{ currentFile: FileSystemFileHandle }> = (props) => {
  const [contents, { mutate }] = createResource(async () => {
    const file = await props.currentFile.getFile();
    const text = await file.text();
    console.log(parseJsonFile(text));
    return text;
  });

  const write = async (value: string) => {
    mutate(value);
    const file = await props.currentFile.createWritable();
    await file.write(value);
    await file.close();
  }

  return (
    <div class="p-4">
      <Suspense fallback="Loading...">
        <Show when={contents()} keyed>
          {(jsonString) => (
            <div class="flex flex-col gap-4">
              <For each={parseJsonFile(jsonString)}>
                {([key, value]) => (
                  <div class="flex justify-between gap-2">
                    <label for={key}>{key}</label>
                    <input
                      id={key}
                      class="text-white w-12 rounded shadow-inner shadow-black bg-transparent focus:bg-zinc-950 border border-zinc-600 focus:border-sky-500 outline-0 px-1"
                      type="number"
                      value={value}
                      oninput={async (e) => {
                        const newJson = JSON.parse(jsonString);
                        newJson[key] = e.currentTarget.valueAsNumber;
                        const newContents = JSON.stringify(newJson, null, 2);
                        write(newContents);
                      }}
                    />
                  </div>
                )}
              </For>
            </div>
          )}
        </Show>
      </Suspense>
    </div>
  );
}

const App: Component = () => {
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

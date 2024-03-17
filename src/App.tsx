import {
  Component,
  For,
  Match,
  Setter,
  Show,
  Suspense,
  Switch,
  createResource,
  createSignal,
} from "solid-js";

const Sidebar: Component<{
  currentFile?: FileSystemFileHandle;
  setCurrentFile: Setter<FileSystemFileHandle | undefined>;
}> = (props) => {
  const [jsonFileHandles, setJsonFileHandles] = createSignal<
    FileSystemFileHandle[]
  >([]);

  return (
    <aside class="flex h-full w-56 flex-col justify-between bg-zinc-800 p-4">
      <nav class="grid justify-start">
        <For each={jsonFileHandles()}>
          {(handle) => (
            <button
              class="text-left"
              disabled={props.currentFile === handle}
              classList={{
                "opacity-50 cursor-pointer": props.currentFile !== handle,
              }}
              onclick={[props.setCurrentFile, handle]}
            >
              {handle.name}
            </button>
          )}
        </For>
      </nav>
      <button
        class="cursor-pointer bg-emerald-600 px-2 py-1"
        onclick={async () => {
          const folder = await window.showDirectoryPicker();
          for await (const handle of folder.values()) {
            if (
              handle.kind === "file" &&
              handle.name.toLowerCase().endsWith(".json")
            ) {
              console.log(handle.name);
              setJsonFileHandles((prev) => prev.concat(handle));
            }
          }
        }}
      >
        open JSON file
      </button>
    </aside>
  );
};

function parseJsonFile(inputJson: string) {
  const json = JSON.parse(inputJson);
  return Object.entries(json).filter(
    (entry): entry is [string, number | string] =>
      typeof entry[1] === "number" || typeof entry[1] === "string",
  );
}

const NumberField: Component<{
  property: string;
  value: number;
  update: (value: number) => Promise<void>;
}> = (props) => (
  <div class="flex justify-between gap-2">
    <label for={props.property}>{props.property}</label>
    <input
      id={props.property}
      class="w-12 rounded border border-zinc-600 bg-transparent px-1 font-mono text-sm text-white shadow-inner shadow-black outline-0 focus:border-sky-500 focus:bg-zinc-950"
      type="number"
      value={props.value}
      oninput={(e) => props.update(e.currentTarget.valueAsNumber)}
    />
  </div>
);

const StringField: Component<{
  property: string;
  value: string;
  update: (value: string) => Promise<void>;
}> = (props) => (
  <div class="flex justify-between gap-2">
    <label for={props.property}>{props.property}</label>
    <input
      id={props.property}
      class="min-w-24 rounded border border-zinc-600 bg-transparent px-1 font-mono text-sm text-white shadow-inner shadow-black outline-0 focus:border-sky-500 focus:bg-zinc-950"
      type="text"
      value={props.value}
      oninput={(e) => props.update(e.currentTarget.value)}
    />
  </div>
);

const ColorField: Component<{
  kind: "hex"; // | 'hexa' | 'rgb' | 'rgba' | 'hsl' | 'hsla';
  property: string;
  value: string;
  update: (value: string) => Promise<void>;
}> = (props) => (
  <div class="flex justify-between gap-2">
    <label for={props.property}>{props.property}</label>
    <div class="flex gap-1">
      <input
        type="text"
        class="w-20 rounded border border-zinc-600 bg-transparent px-1 font-mono text-sm text-white shadow-inner shadow-black outline-0 focus:border-sky-500 focus:bg-zinc-950"
        value={props.value}
        onchange={(e) => props.update(e.currentTarget.value)}
        // TODO: validate before calling update to ensure it's valid hex
      />
      <input
        id={props.property}
        class="w-8 rounded border border-zinc-600 bg-transparent px-1 text-white shadow-inner shadow-black outline-0 focus:border-sky-500 focus:bg-zinc-950"
        type="color"
        value={props.value}
        onchange={(e) => {
          // TODO: run the color through a formatter to output
          // as the desired `kind`
          props.update(e.currentTarget.value);
        }}
      />
    </div>
  </div>
);

const hexRegex = /^#[a-f0-9]{6}$/gi;

// TODO: add an error boundary for parse fails
const Editor: Component<{ currentFile: FileSystemFileHandle }> = (props) => {
  const [contents, { mutate }] = createResource(async () => {
    const file = await props.currentFile.getFile();
    const text = await file.text();
    console.log(parseJsonFile(text));
    return text;
  });

  const write = async (value: string) => {
    mutate(value);
    // TODO: do we need to createWritable() and close() on every input or can
    // those be executed on file open / on cleanup instead?
    const file = await props.currentFile.createWritable();
    await file.write(value);
    await file.close();
  };

  const updateProperty = async (
    jsonString: string,
    key: string,
    value: string | number,
  ) => {
    const newJson = JSON.parse(jsonString);
    newJson[key] = value;
    const newContents = JSON.stringify(newJson, null, 2);
    await write(newContents);
  };

  return (
    <div class="p-4">
      <Suspense fallback="Loading...">
        <Show when={contents()} keyed>
          {(jsonString) => (
            <div class="flex flex-col gap-4">
              <For each={parseJsonFile(jsonString)}>
                {([key, value]) => (
                  <Switch
                    fallback={
                      <StringField
                        property={key}
                        value={String(value)}
                        update={async (newValue) => {
                          await updateProperty(jsonString, key, newValue);
                        }}
                      />
                    }
                  >
                    <Match when={typeof value === "number"}>
                      <NumberField
                        property={key}
                        value={value as number}
                        update={async (newValue) => {
                          await updateProperty(jsonString, key, newValue);
                        }}
                      />
                    </Match>
                    <Match
                      when={typeof value === "string" && hexRegex.test(value)}
                    >
                      <ColorField
                        kind="hex"
                        property={key}
                        value={String(value)}
                        update={async (newValue) => {
                          await updateProperty(jsonString, key, newValue);
                        }}
                      />
                    </Match>
                  </Switch>
                )}
              </For>
            </div>
          )}
        </Show>
      </Suspense>
    </div>
  );
};

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
};

export default App;

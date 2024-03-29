import { Component, For, Match, Setter, Show, Switch, createEffect, createSignal, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

export const Sidebar: Component<{
  currentFile?: FileSystemFileHandle;
  setCurrentFile: Setter<FileSystemFileHandle | undefined>;
}> = (props) => {
  const [jsonFileHandles, setJsonFileHandles] = createSignal<FileSystemFileHandle[]>([]);

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
        class="cursor-pointer bg-emerald-600 py-1 px-2"
        onclick={async () => {
          const folder = await window.showDirectoryPicker();
          for await (const handle of folder.values()) {
            if (handle.kind === "file" && handle.name.toLowerCase().endsWith(".json")) {
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

const NumberField: Component<{
  property: string;
  value: number;
  update: (value: number) => Promise<void>;
}> = (props) => {
  const [isPointerDown, setIsPointerDown] = createSignal(false);
  const [isConfigOpen, setIsConfigOpen] = createSignal(false);
  const [step, setStep] = createSignal(1);
  let popover: HTMLDivElement;

  const onDocumentClick = (e: MouseEvent) => {
    if (e.target instanceof Node && !popover.contains(e.target)) {
      setIsConfigOpen(false);
    }
  };

  document.addEventListener("click", onDocumentClick);
  onCleanup(() => {
    document.removeEventListener("click", onDocumentClick);
  });

  return (
    <div class="flex justify-between gap-2">
      <label for={props.property}>{props.property}</label>
      <div class="relative flex gap-1" ref={popover!}>
        <input
          id={props.property}
          class="w-12 cursor-ew-resize rounded border border-zinc-600 bg-transparent px-1 font-mono text-sm text-white shadow-inner shadow-black outline-0 focus:border-sky-500 focus:bg-zinc-950"
          type="number"
          value={props.value}
          oninput={(e) => props.update(e.currentTarget.valueAsNumber)}
          onpointerdown={(e) => {
            e.target.setPointerCapture(e.pointerId);
            setIsPointerDown(true);
          }}
          onpointermove={(e) => {
            if (!isPointerDown()) return;
            console.log(e.movementX);
            props.update(props.value + e.movementX * step());
          }}
          onpointerup={() => {
            setIsPointerDown(false);
          }}
        />
        <button
          onclick={() => {
            setIsConfigOpen((wasOpen) => !wasOpen);
          }}
        >
          ...
        </button>
        <Show when={isConfigOpen()}>
          <div class="absolute top-full right-0 z-10 bg-zinc-800 shadow">
            <label class="flex gap-2">
              step
              <input
                type="text"
                class="w-12 cursor-ew-resize rounded border border-zinc-600 bg-transparent px-1 font-mono text-sm text-white shadow-inner shadow-black outline-0 focus:border-sky-500 focus:bg-zinc-950"
                value={step()}
                oninput={(e) => {
                  const n = parseFloat(e.currentTarget.value);
                  if (!Number.isNaN(n)) setStep(n);
                }}
              />
            </label>
          </div>
        </Show>
      </div>
    </div>
  );
};

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
        oninput={(e) => {
          // TODO: run the color through a formatter to output
          // as the desired `kind`
          props.update(e.currentTarget.value);
        }}
      />
    </div>
  </div>
);

// TODO: add an error boundary for parse fails
export const Editor: Component<{ currentFile: FileSystemFileHandle }> = (props) => {
  const [obj, setObject] = createStore<Record<string, unknown>>({});
  let lastUpdate = Date.now();
  createEffect(async () => {
    const file = await props.currentFile.getFile();
    const text = await file.text();
    const json = JSON.parse(text);
    setObject(reconcile(json));
  });

  createEffect(() => {
    const interval = setInterval(async () => {
      const file = await props.currentFile.getFile();
      const text = await file.text();
      const json = JSON.parse(text);

      if (lastUpdate < file.lastModified) {
        setObject(reconcile(json));
        lastUpdate = Date.now();
      }
    }, 1000);
    onCleanup(() => clearInterval(interval));
  });

  const write = async (value: string) => {
    // TODO: do we need to createWritable() and close() on every input or can
    // those be executed on file open / on cleanup instead?
    const file = await props.currentFile.createWritable();
    await file.write(value);
    await file.close();
  };

  const updateProperty = async (key: string, value: string | number) => {
    setObject(reconcile({ ...obj, [key]: value }));
    lastUpdate = Date.now();
    const newContents = JSON.stringify(obj, null, 2);
    await write(newContents);
  };

  return (
    <div class="p-4">
      <div class="flex flex-col gap-4">
        <For each={Object.keys(obj)}>
          {(key) => (
            <Switch
              fallback={
                <StringField
                  property={key}
                  value={String(obj[key])}
                  update={async (newValue) => {
                    await updateProperty(key, newValue);
                  }}
                />
              }
            >
              <Match when={typeof obj[key] === "number"}>
                <NumberField
                  property={key}
                  value={obj[key] as number}
                  update={async (newValue) => {
                    await updateProperty(key, newValue);
                  }}
                />
              </Match>
              <Match when={typeof obj[key] === "string" && /^#[a-f0-9]{6}$/gi.test(obj[key] as string)}>
                <ColorField
                  kind="hex"
                  property={key}
                  value={String(obj[key])}
                  update={async (newValue) => {
                    await updateProperty(key, newValue);
                  }}
                />
              </Match>
              <Match when={typeof obj[key] === "object"}>
                <p>Object type not implemented for key {key}</p>
              </Match>
              <Match when={Array.isArray(obj[key])}>
                <p>Array type not implemented for key {key}</p>
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </div>
  );
};

import { Component, Show, createSignal } from "solid-js";
import { Editor, Sidebar } from "./Editor";

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

import { Box, Button, IconButton, Menu, MenuItem, Select, Tooltip } from "@mui/material";
import { useEffect, useRef, useState } from "react";

type NewsContentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
};

export default function NewsContentEditor({ value, onChange, onUploadImage }: NewsContentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

  useEffect(() => {
    if (!editorRef.current || editorRef.current.innerHTML === value) return;
    editorRef.current.innerHTML = value;
  }, [value]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const range = savedRangeRef.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const insertImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      editorRef.current?.focus();
      restoreSelection();
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      const image = document.createElement("img");
      image.src = url;
      image.alt = file.name || "Imagen de la noticia";
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      image.style.display = "block";
      image.style.margin = "12px 0";
      range.deleteContents();
      range.insertNode(image);
      range.setStartAfter(image);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      onChange(editorRef.current?.innerHTML ?? "");
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const chooseImage = () => {
    setMenuPosition(null);
    fileInputRef.current?.click();
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    onChange(editorRef.current?.innerHTML ?? "");
    saveSelection();
  };

  const addLink = () => {
    editorRef.current?.focus();
    restoreSelection();
    const url = window.prompt("Pegá la URL del enlace");
    if (!url?.trim()) return;
    runCommand("createLink", url.trim());
  };

  const toolbarButton = (label: string, icon: string, command: string, value?: string) => (
    <Tooltip key={label} title={label}>
      <IconButton
        size="small"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand(command, value)}
        aria-label={label}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </IconButton>
    </Tooltip>
  );

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void insertImage(file);
          event.target.value = "";
        }}
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          flexWrap: "wrap",
          mb: 1,
          p: 0.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "rgba(255,255,255,0.03)",
        }}
      >
        {toolbarButton("Negrita", "format_bold", "bold")}
        {toolbarButton("Cursiva", "format_italic", "italic")}
        {toolbarButton("Subrayado", "format_underlined", "underline")}
        {toolbarButton("Tachado", "strikethrough_s", "strikeThrough")}
        <Select
          size="small"
          defaultValue="p"
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => runCommand("formatBlock", event.target.value)}
          sx={{ minWidth: 118, mx: 0.5, height: 32 }}
          aria-label="Estilo de texto"
        >
          <MenuItem value="p">Párrafo</MenuItem>
          <MenuItem value="h2">Título</MenuItem>
          <MenuItem value="h3">Subtítulo</MenuItem>
          <MenuItem value="blockquote">Cita</MenuItem>
        </Select>
        {toolbarButton("Lista con viñetas", "format_list_bulleted", "insertUnorderedList")}
        {toolbarButton("Lista numerada", "format_list_numbered", "insertOrderedList")}
        {toolbarButton("Alinear a la izquierda", "format_align_left", "justifyLeft")}
        {toolbarButton("Centrar", "format_align_center", "justifyCenter")}
        {toolbarButton("Alinear a la derecha", "format_align_right", "justifyRight")}
        <Tooltip title="Insertar enlace">
          <IconButton size="small" onMouseDown={(event) => event.preventDefault()} onClick={addLink} aria-label="Insertar enlace">
            <span className="material-symbols-outlined">link</span>
          </IconButton>
        </Tooltip>
        {toolbarButton("Deshacer", "undo", "undo")}
        {toolbarButton("Rehacer", "redo", "redo")}
        {toolbarButton("Quitar formato", "format_clear", "removeFormat")}
        <Button
          size="small"
          variant="outlined"
          onClick={chooseImage}
          disabled={uploading}
          startIcon={<span className="material-symbols-outlined">image</span>}
        >
          {uploading ? "Subiendo imagen..." : "Insertar imagen"}
        </Button>
      </Box>
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={saveSelection}
        onPaste={(event) => {
          const imageFile = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
          if (!imageFile) return;
          event.preventDefault();
          saveSelection();
          void insertImage(imageFile);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          const imageFile = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/"));
          if (!imageFile) return;
          event.preventDefault();
          saveSelection();
          void insertImage(imageFile);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          saveSelection();
          setMenuPosition({ mouseX: event.clientX + 2, mouseY: event.clientY - 6 });
        }}
        sx={{
          minHeight: 280,
          maxHeight: 560,
          overflowY: "auto",
          p: 1.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          outline: "none",
          textAlign: "left",
          lineHeight: 1.6,
          "&:focus": { borderColor: "primary.main" },
          "& img": { maxWidth: "100%", height: "auto", cursor: "default" },
          "&:empty::before": { content: '"Escribí el contenido de la noticia aquí..."', color: "text.secondary" },
        }}
      />
      <Menu
        open={Boolean(menuPosition)}
        onClose={() => setMenuPosition(null)}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition ? { top: menuPosition.mouseY, left: menuPosition.mouseX } : undefined}
      >
        <MenuItem onClick={chooseImage} disabled={uploading}>
          <span className="material-symbols-outlined" style={{ marginRight: 8 }}>image</span>
          Subir imagen
        </MenuItem>
      </Menu>
    </Box>
  );
}

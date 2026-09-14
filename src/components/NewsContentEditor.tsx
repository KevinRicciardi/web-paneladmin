import { Box, Button } from "@mui/material";
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
    fileInputRef.current?.click();
  };

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
        onInput={(event) => {
          onChange(event.currentTarget.innerHTML);
        }}
        onKeyUp={() => {
          saveSelection();
        }}
        onMouseUp={() => {
          saveSelection();
        }}
        onFocus={() => {
          saveSelection();
        }}
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
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          whiteSpace: "normal",
          "&:focus": { borderColor: "primary.main" },
          "& img": { maxWidth: "100%", height: "auto", cursor: "default" },
          "& *": { overflowWrap: "anywhere", wordBreak: "break-word" },
          "&:empty::before": { content: '"Escribí el contenido de la noticia aquí..."', color: "text.secondary" },
        }}
      />
    </Box>
  );
}

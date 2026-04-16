import { useEffect, useRef, useState, type DragEvent } from "react";

export interface CollectionDropTargetHandlers {
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

interface UseCollectionFileDropOptions {
  onFilesDrop: (files: FileList | null) => void;
}

export function isFileDrag(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer
    ? Array.from(dataTransfer.types).includes("Files")
    : false;
}

export function useCollectionFileDrop({
  onFilesDrop,
}: UseCollectionFileDropOptions): {
  isCollectionDragActive: boolean;
  dropTargetHandlers: CollectionDropTargetHandlers;
} {
  const pageDragDepthRef = useRef(0);
  const [isCollectionDragActive, setIsCollectionDragActive] = useState(false);

  useEffect(() => {
    const resetCollectionDrag = () => {
      pageDragDepthRef.current = 0;
      setIsCollectionDragActive(false);
    };

    const handleWindowDragEnter = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      pageDragDepthRef.current += 1;
      setIsCollectionDragActive(true);
    };

    const handleWindowDragOver = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      event.preventDefault();
      dataTransfer.dropEffect = "copy";
      setIsCollectionDragActive(true);
    };

    const handleWindowDragLeave = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      pageDragDepthRef.current = Math.max(0, pageDragDepthRef.current - 1);

      if (pageDragDepthRef.current === 0) {
        setIsCollectionDragActive(false);
      }
    };

    const handleWindowDrop = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;

      if (!dataTransfer || !isFileDrag(dataTransfer)) {
        return;
      }

      event.preventDefault();
      resetCollectionDrag();
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("dragend", resetCollectionDrag);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("dragend", resetCollectionDrag);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

  const handleDropTargetDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setIsCollectionDragActive(true);
  };

  const handleDropTargetDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    if (!isCollectionDragActive) {
      setIsCollectionDragActive(true);
    }
  };

  const handleDropTargetDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    pageDragDepthRef.current = 0;
    setIsCollectionDragActive(false);
    onFilesDrop(event.dataTransfer.files);
  };

  return {
    isCollectionDragActive,
    dropTargetHandlers: {
      onDragEnter: handleDropTargetDragEnter,
      onDragOver: handleDropTargetDragOver,
      onDrop: handleDropTargetDrop,
    },
  };
}

import { Box, useColorMode } from "@chakra-ui/react";
import JSONEditor, { JSONEditorMode, JSONEditorOptions } from "jsoneditor";
import "jsoneditor/dist/jsoneditor.css";
import { forwardRef, useEffect, useRef } from "react";
import "./styles.css";
import "./themes.js";

export type JSONEditorProps = {
  onChange: (value: string) => void;
  json: any;
  mode?: JSONEditorMode;
};
export const JsonEditor = forwardRef<HTMLDivElement, JSONEditorProps>(
  ({ json, onChange, mode = "code" }, ref) => {
    const { colorMode } = useColorMode();
    const options: JSONEditorOptions = {
      mode,
      onChangeText: onChange,
      statusBar: false,
      mainMenuBar: false,
      theme: colorMode === "dark" ? "ace/theme/nord_dark" : "ace/theme/dawn",
    };

    const jsonEditorContainer = useRef<HTMLDivElement>(null);
    const jsonEditorRef = useRef<JSONEditor | null>(null);

    useEffect(() => {
      jsonEditorRef.current = new JSONEditor(
        jsonEditorContainer.current!,
        options
      );

      return () => {
        if (jsonEditorRef.current) jsonEditorRef.current.destroy();
      };
    }, []);

    useEffect(() => {
      if (jsonEditorRef.current) jsonEditorRef.current.update(json);
    }, [json]);

    // switch the syntax colors when the panel's color mode changes
    useEffect(() => {
      const ace = (jsonEditorRef.current as any)?.aceEditor;
      ace?.setTheme(colorMode === "dark" ? "ace/theme/nord_dark" : "ace/theme/dawn");
    }, [colorMode]);

    return (
      <Box
        ref={ref}
        border="1px solid"
        borderColor="light-border"
        overflow="hidden"
        _dark={{
          borderColor: "gray.600",
        }}
        borderRadius={5}
        h="full"
      >
        <Box height="full" ref={jsonEditorContainer} />
      </Box>
    );
  }
);

// Drop-in replacements for Chakra's Modal parts. Inside <AsPage> they render as
// a normal page section (no overlay, no close button, always open), so the same
// component works as a full page/tab. Outside it they are the regular modal.
// Only the window components themselves import these; confirm dialogs they open
// import Chakra's Modal directly and stay real modals.
import {
  Box,
  BoxProps,
  Card,
  HStack,
  Modal as ChakraModal,
  ModalBody as ChakraModalBody,
  ModalCloseButton as ChakraModalCloseButton,
  ModalContent as ChakraModalContent,
  ModalFooter as ChakraModalFooter,
  ModalHeader as ChakraModalHeader,
  ModalOverlay as ChakraModalOverlay,
  ModalProps,
} from "@chakra-ui/react";
import { createContext, FC, ReactNode, useContext } from "react";

const PageModeContext = createContext(false);
export const usePageMode = () => useContext(PageModeContext);

export const AsPage: FC<{ children: ReactNode }> = ({ children }) => (
  <PageModeContext.Provider value={true}>{children}</PageModeContext.Provider>
);

export const Modal: FC<ModalProps> = (props) =>
  usePageMode() ? <>{props.children}</> : <ChakraModal {...props} />;

export const ModalOverlay: FC<any> = (props) =>
  usePageMode() ? null : <ChakraModalOverlay {...props} />;

export const ModalCloseButton: FC<any> = (props) =>
  usePageMode() ? null : <ChakraModalCloseButton {...props} />;

export const ModalContent: FC<BoxProps & { children?: ReactNode }> = ({ children, ...props }) => {
  if (!usePageMode())
    return <ChakraModalContent {...(props as any)}>{children}</ChakraModalContent>;
  // modal sizing props make no sense on a page
  const { mx, my, m, maxW, maxWidth, w, width, h, height, ...rest } = props as any;
  return (
    <Card
      className="alexen-page"
      w="full"
      borderWidth="1px"
      borderColor="light-border"
      boxShadow="none"
      borderRadius="12px"
      _dark={{ borderColor: "gray.600" }}
      {...rest}
    >
      {children}
    </Card>
  );
};

export const ModalHeader: FC<BoxProps> = (props) =>
  usePageMode() ? (
    <Box px={{ base: 4, md: 6 }} pt={{ base: 4, md: 5 }} pb={2} fontWeight="semibold" {...props} />
  ) : (
    <ChakraModalHeader {...props} />
  );

export const ModalBody: FC<BoxProps> = (props) => {
  if (!usePageMode()) return <ChakraModalBody {...props} />;
  // fixed dialog widths (e.g. w="440px") would squeeze a page into a column
  const { w, width, minW, maxW, ...rest } = props as any;
  return <Box px={{ base: 4, md: 6 }} py={3} w="full" {...rest} />;
};

export const ModalFooter: FC<BoxProps> = (props) =>
  usePageMode() ? (
    <HStack
      px={{ base: 4, md: 6 }}
      py={4}
      justifyContent="flex-end"
      flexWrap="wrap"
      gap={2}
      {...(props as any)}
    />
  ) : (
    <ChakraModalFooter {...props} />
  );

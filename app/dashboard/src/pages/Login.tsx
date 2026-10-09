import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  chakra,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Text,
  useColorMode,
  VStack,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { updateThemeColor } from "utils/themeColor";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Footer } from "components/Footer";
import { Input } from "components/Input";
import { fetch } from "service/http";
import { removeAuthToken, setAuthToken } from "utils/authStorage";
import { ReactComponent as Logo } from "assets/logo.svg";
import { useTranslation } from "react-i18next";
import { serverMessage } from "utils/serverMessage";
import { Language } from "components/Language";

const schema = z.object({
  username: z.string().min(1, "login.fieldRequired"),
  password: z.string().min(1, "login.fieldRequired"),
});

// light / dark before signing in too
const ThemeSwitch: FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { t } = useTranslation();
  return (
    <IconButton
      size="sm"
      variant="outline"
      aria-label={t("header.theme", "Theme")}
      icon={colorMode === "dark" ? <SunIcon width={16} /> : <MoonIcon width={16} />}
      onClick={() => {
        updateThemeColor(colorMode === "dark" ? "light" : "dark");
        toggleColorMode();
      }}
    />
  );
};

export const LogoIcon = chakra(Logo, {
  baseStyle: {
    w: 14,
    h: 14,
    borderRadius: "18px",
    boxShadow: "0 10px 30px color-mix(in srgb, var(--chakra-colors-primary-500) 40%, transparent)",
  },
});

const LoginIcon = chakra(ArrowRightOnRectangleIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    strokeWidth: "2px",
  },
});

export const Login: FC = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  let location = useLocation();
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(schema),
  });
  useEffect(() => {
    removeAuthToken();
    if (location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, []);
  const login = (values: FieldValues) => {
    setError("");
    const formData = new FormData();
    formData.append("username", values.username);
    formData.append("password", values.password);
    formData.append("grant_type", "password");
    setLoading(true);
    fetch("/admin/token", { method: "post", body: formData })
      .then(({ access_token: token }) => {
        setAuthToken(token);
        navigate("/");
      })
      .catch((err) => {
        // no answer at all (server down, network cut): say so instead of breaking the page
        const detail = err?.response?._data?.detail;
        setError(detail ? serverMessage(t, typeof detail === "string" ? detail : JSON.stringify(detail)) : t("errors.network"));
      })
      .finally(setLoading.bind(null, false));
  };
  return (
    <VStack justifyContent="space-between" minH="100dvh" p={{ base: 4, md: 6 }} w="full" className="alexen-login">
      <HStack justifyContent="end" w="full" spacing={2}>
        <ThemeSwitch />
        <Language />
      </HStack>
      <Box
        className="chakra-card alexen-login-card"
        w="full"
        maxW="400px"
        p={{ base: 6, md: 8 }}
        borderRadius="28px"
        bg="var(--app-surface)"
        borderWidth="1px"
        borderColor="blackAlpha.50"
        boxShadow="0 24px 64px rgba(16,24,40,.10)"
        _dark={{ bg: "gray.750", borderColor: "var(--alexen-line)", boxShadow: "0 24px 64px rgba(0,0,0,.45)" }}
      >
        <VStack spacing={2} mb={6}>
          <LogoIcon />
          <Text fontSize="2xl" fontWeight="bold" letterSpacing="-0.02em" pt={2}>
            {t("login.loginYourAccount")}
          </Text>
          <Text color="gray.500" fontSize="sm" textAlign="center">
            {t("login.welcomeBack")}
          </Text>
        </VStack>
        <form onSubmit={handleSubmit(login)}>
          <VStack spacing={3}>
            <FormControl>
              <Input
                w="full"
                size="lg"
                placeholder={t("username")}
                autoComplete="username"
                {...register("username")}
                error={t(errors?.username?.message as string)}
              />
            </FormControl>
            <FormControl>
              <Input
                w="full"
                size="lg"
                type="password"
                placeholder={t("password")}
                autoComplete="current-password"
                {...register("password")}
                error={t(errors?.password?.message as string)}
              />
            </FormControl>
            {error && (
              <Alert status="error" borderRadius="12px">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button isLoading={loading} type="submit" w="full" size="lg" colorScheme="primary" mt={1}>
              <LoginIcon marginRight={2} />
              {t("login")}
            </Button>
          </VStack>
        </form>
      </Box>
      <Footer />
    </VStack>
  );
};

export default Login;

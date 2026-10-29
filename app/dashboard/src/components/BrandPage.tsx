// Brand (white-label) settings — creator only. Changes the panel name, vendor and
// support contact everywhere (sidebar, footer, docs, license page and every
// translated string via the i18n brand post-processor). Empty fields fall back to
// the built-in defaults, so the panel is never left unbranded.
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { PaintBrushIcon } from "@heroicons/react/24/outline";
import { ChangeEvent, FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";

type Brand = { name: string; vendor: string; support_telegram: string; support_url: string };

const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;

export const BrandPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery<Brand>({ queryKey: "brand-edit", queryFn: () => fetch("/brand") });
  const [form, setForm] = useState<Brand>({ name: "", vendor: "", support_telegram: "", support_url: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = (k: keyof Brand) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value.slice(0, 120) }));

  const save = () => {
    setBusy(true);
    fetch("/brand", { method: "PUT", body: form })
      .then((d: Brand) => {
        setForm(d);
        // refresh the live brand everywhere (footer, sidebar, i18n post-processor)
        queryClient.invalidateQueries("brand");
        queryClient.invalidateQueries("brand-edit");
        toast({ title: t("brand.saved"), status: "success", isClosable: true, position: "top", duration: 3000 });
      })
      .catch(() =>
        toast({ title: t("brand.saveFailed"), status: "error", isClosable: true, position: "top", duration: 4000 })
      )
      .finally(() => setBusy(false));
  };

  return (
    <VStack align="stretch" spacing={4} maxW="640px">
      <Box {...card}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Box as={PaintBrushIcon} w={5} h={5} color="primary.400" />
          <Heading size="md">{t("brand.title")}</Heading>
        </Box>
        <Text fontSize="sm" color="gray.500" mb={4}>
          {t("brand.desc")}
        </Text>

        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">{t("brand.name")}</FormLabel>
            <Input value={form.name} onChange={set("name")} placeholder="Alexen" />
            <FormHelperText>{t("brand.nameHelp")}</FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">{t("brand.vendor")}</FormLabel>
            <Input value={form.vendor} onChange={set("vendor")} placeholder="Alexander LLC" />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">{t("brand.supportTelegram")}</FormLabel>
            <Input value={form.support_telegram} onChange={set("support_telegram")} placeholder="@alexvpns" />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">{t("brand.supportUrl")}</FormLabel>
            <Input value={form.support_url} onChange={set("support_url")} placeholder="https://t.me/alexvpns" />
            <FormHelperText>{t("brand.supportHelp")}</FormHelperText>
          </FormControl>

          <Box>
            <Button colorScheme="primary" isLoading={busy} onClick={save}>
              {t("brand.save")}
            </Button>
          </Box>
        </VStack>
      </Box>
    </VStack>
  );
};

export default BrandPage;

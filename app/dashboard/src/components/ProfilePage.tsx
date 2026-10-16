// My profile (app/routers/profile.py): a picture, a display name, a bio and a contact, what
// this account may do, and its own password. Everyone edits only their own.
import {
  Avatar,
  Badge,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Text,
  Textarea,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { CameraIcon, CheckIcon, EyeIcon, EyeSlashIcon, KeyIcon, TrashIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { setAuthToken } from "utils/authStorage";
import { formatBytes } from "utils/formatByte";
import { serverMessage } from "utils/serverMessage";
import { PageLoading } from "./PageLoading";

export type Profile = {
  username: string;
  role: "creator" | "sudo" | "admin";
  display_name: string;
  bio: string;
  contact: string;
  avatar: string | null;
  created_at: string | null;
  updated_at: string | null;
  users: number;
  users_limit: number | null;
  traffic_limit: number | null;
  traffic_used: number;
  expire_date: string | null;
};

const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;
const ROLE_COLOR = { creator: "purple", sudo: "blue", admin: "green" } as const;

export const useProfile = (enabled = true) =>
  useQuery<Profile>({ queryKey: "profile", queryFn: () => fetch("/profile"), enabled, retry: false, staleTime: 5 * 60000 });

// a picture from the device: the middle square, 256 px, as WebP (JPEG where WebP can't be made)
const toAvatar = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error("type"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      let out = c.toDataURL("image/webp", 0.86);
      if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/jpeg", 0.88);
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("read"));
    };
    img.src = url;
  });

const Fact: FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <Box minW={0}>
    <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="wider">
      {label}
    </Text>
    <Text fontSize="md" fontWeight="semibold" isTruncated>
      {value}
    </Text>
    {sub && (
      <Text fontSize="2xs" color="gray.500">
        {sub}
      </Text>
    )}
  </Box>
);

const PasswordInput: FC<{ value: string; onChange: (v: string) => void; auto: string; invalid?: boolean }> = ({ value, onChange, auto, invalid }) => {
  const [show, setShow] = useState(false);
  return (
    <InputGroup>
      <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} isInvalid={invalid} pr="40px" />
      <InputRightElement>
        <IconButton aria-label="show" size="xs" variant="ghost" icon={<Icon as={show ? EyeSlashIcon : EyeIcon} boxSize="16px" />} onClick={() => setShow(!show)} />
      </InputRightElement>
    </InputGroup>
  );
};

const PasswordCard: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const mismatch = !!n2 && n1 !== n2;
  const short = !!n1 && n1.length < 8;
  const save = () => {
    if (!cur || !n1) return setErr(t("profile.fillPasswords"));
    if (short) return setErr(t("profile.tooShort"));
    if (mismatch) return setErr(t("profile.mismatch"));
    setBusy(true);
    setErr("");
    fetch("/profile/password", { method: "POST", body: { current: cur, new: n1 } })
      .then((r: { access_token: string }) => {
        setAuthToken(r.access_token);
        setCur("");
        setN1("");
        setN2("");
        toast({ status: "success", title: t("profile.passwordChanged"), position: "top", duration: 4000 });
      })
      .catch((e: any) => setErr(serverMessage(t, e?.response?._data?.detail) || t("errors.generic")))
      .finally(() => setBusy(false));
  };
  return (
    <Box {...card}>
      <HStack spacing={2} mb={1}>
        <Icon as={KeyIcon} boxSize="18px" color="primary.400" />
        <Text fontWeight="semibold">{t("profile.password")}</Text>
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={4}>
        {t("profile.passwordHelp")}
      </Text>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input type="text" name="username" autoComplete="username" hidden readOnly />
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <FormControl>
            <FormLabel fontSize="sm">{t("profile.currentPassword")}</FormLabel>
            <PasswordInput value={cur} onChange={setCur} auto="current-password" />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">{t("profile.newPassword")}</FormLabel>
            <PasswordInput value={n1} onChange={setN1} auto="new-password" invalid={short} />
            <FormHelperText fontSize="2xs">{t("profile.min8")}</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">{t("profile.repeatPassword")}</FormLabel>
            <PasswordInput value={n2} onChange={setN2} auto="new-password" invalid={mismatch} />
          </FormControl>
        </SimpleGrid>
        {err && (
          <Text fontSize="sm" color="red.400" mt={3}>
            {err}
          </Text>
        )}
        <HStack justify="flex-end" mt={4}>
          <Button type="submit" colorScheme="primary" isLoading={busy} leftIcon={<KeyIcon width={16} />}>
            {t("profile.changePassword")}
          </Button>
        </HStack>
      </form>
    </Box>
  );
};

export const ProfilePage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: p, isError, error } = useProfile();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [pic, setPic] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!p) return;
    setName(p.display_name);
    setBio(p.bio);
    setContact(p.contact);
  }, [p?.username, p?.updated_at]);

  if (!p && !isError) return <PageLoading rows={3} />;
  if (!p)
    return (
      <Box {...card}>
        <Text fontSize="sm" color="gray.500">
          {serverMessage(t, (error as any)?.response?._data?.detail) || t("errors.generic")}
        </Text>
      </Box>
    );

  const put = (body: Partial<Profile>, ok: string) =>
    fetch("/profile", { method: "PUT", body }).then((d: Profile) => {
      qc.setQueryData("profile", d);
      toast({ status: "success", title: ok, position: "top", duration: 2500 });
      return d;
    });
  const fail = (e: any) => toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top" });

  const pick = (f?: File) => {
    if (!f) return;
    setPic(true);
    toAvatar(f)
      .then((avatar) => put({ avatar }, t("profile.pictureSaved")))
      .catch((e) => (e?.message === "type" || e?.message === "read" ? toast({ status: "error", title: t("profile.notAnImage"), position: "top" }) : fail(e)))
      .finally(() => {
        setPic(false);
        if (file.current) file.current.value = "";
      });
  };
  const changed = name !== p.display_name || bio !== p.bio || contact !== p.contact;
  const save = () => {
    setBusy(true);
    put({ display_name: name, bio, contact }, t("profile.saved"))
      .catch(fail)
      .finally(() => setBusy(false));
  };
  const role = t(`profile.role.${p.role}`);
  const unlimited = t("lic.unlimited");

  return (
    <VStack align="stretch" spacing={4} maxW="1000px">
      <Box {...card} p={0} overflow="hidden">
        <Box h={{ base: "70px", md: "96px" }} bgGradient="linear(to-r, primary.500, purple.400, cyan.400)" opacity={0.9} />
        <Box px={{ base: 3.5, md: 5 }} pb={{ base: 4, md: 5 }}>
          <HStack align="flex-end" spacing={4} mt={{ base: "-36px", md: "-44px" }} flexWrap="wrap" rowGap={3}>
            <Box position="relative" flexShrink={0}>
              <Avatar
                size={{ base: "xl", md: "2xl" }}
                name={p.display_name || p.username}
                src={p.avatar || undefined}
                bg="primary.500"
                color="white"
                borderWidth="4px"
                borderColor="var(--chakra-colors-chakra-body-bg)"
                className="alexen-avatar"
              />
              <Tooltip label={t("profile.changePicture")}>
                <IconButton
                  aria-label={t("profile.changePicture")}
                  icon={<Icon as={CameraIcon} boxSize="16px" />}
                  size="sm"
                  borderRadius="full"
                  colorScheme="primary"
                  position="absolute"
                  bottom="2px"
                  right="2px"
                  isLoading={pic}
                  onClick={() => file.current?.click()}
                />
              </Tooltip>
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </Box>
            <Box minW={0} flex="1" pb={1}>
              <HStack spacing={2} flexWrap="wrap">
                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" isTruncated>
                  {p.display_name || p.username}
                </Text>
                <Badge colorScheme={ROLE_COLOR[p.role]}>{role}</Badge>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                @{p.username}
                {p.created_at ? ` · ${t("profile.memberSince", { date: dayjs.utc(p.created_at).local().format("DD.MM.YYYY") })}` : ""}
              </Text>
            </Box>
            {p.avatar && (
              <Button size="sm" variant="ghost" leftIcon={<TrashIcon width={15} />} onClick={() => put({ avatar: "" }, t("profile.pictureRemoved")).catch(fail)}>
                {t("profile.removePicture")}
              </Button>
            )}
          </HStack>
          {p.bio && (
            <Text fontSize="sm" mt={4} whiteSpace="pre-wrap" color="gray.600" _dark={{ color: "gray.300" }}>
              {p.bio}
            </Text>
          )}
        </Box>
      </Box>

      <Box {...card}>
        <HStack spacing={2} mb={4}>
          <Icon as={UserCircleIcon} boxSize="18px" color="primary.400" />
          <Text fontWeight="semibold">{t("profile.about")}</Text>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          <FormControl>
            <FormLabel fontSize="sm">{t("profile.displayName")}</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 64))} placeholder={p.username} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">{t("profile.contact")}</FormLabel>
            <Input value={contact} onChange={(e) => setContact(e.target.value.slice(0, 100))} placeholder="@telegram" />
          </FormControl>
        </SimpleGrid>
        <FormControl mt={3}>
          <FormLabel fontSize="sm">{t("profile.bio")}</FormLabel>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} rows={4} placeholder={t("profile.bioPlaceholder")} resize="vertical" />
          <FormHelperText fontSize="2xs" textAlign="right">
            {bio.length} / 500
          </FormHelperText>
        </FormControl>
        <HStack justify="flex-end" mt={2}>
          <Button colorScheme="primary" leftIcon={<CheckIcon width={16} />} onClick={save} isLoading={busy} isDisabled={!changed}>
            {t("profile.save")}
          </Button>
        </HStack>
      </Box>

      <Box {...card}>
        <Text fontWeight="semibold" mb={4}>
          {t("profile.account")}
        </Text>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Fact label={t("profile.roleLabel")} value={role} />
          <Fact label={t("profile.users")} value={p.users_limit ? `${p.users} / ${p.users_limit}` : String(p.users)} />
          <Fact
            label={t("profile.traffic")}
            value={p.traffic_limit ? `${formatBytes(p.traffic_used, 1)} / ${formatBytes(p.traffic_limit, 1)}` : String(formatBytes(p.traffic_used, 1))}
            sub={p.traffic_limit ? undefined : unlimited}
          />
          <Fact label={t("profile.expires")} value={p.expire_date ? dayjs.utc(p.expire_date).local().format("DD.MM.YYYY") : t("lic.noEnd")} />
        </SimpleGrid>
      </Box>

      <PasswordCard />
    </VStack>
  );
};

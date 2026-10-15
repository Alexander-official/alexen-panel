// The backend answers in English; known messages are shown in the panel's
// language here (unknown ones pass through unchanged). Keys: serverMsg.*
type T = (key: string, opts?: any) => string;

const RULES: [RegExp, string, string[]][] = [
  [/^The panel can't reach (.+) \(network unreachable\): check the server's address$/, "unreachable", ["host"]],
  [/^Nothing listens on (.+):(\d+): the agent isn't installed on this server yet .*$/, "notListening", ["host", "port"]],
  [/^No answer from (.+):(\d+): open TCP \d+ .*$/, "noAnswer", ["host", "port"]],
  [/^Can't resolve (.+): check the server's address$/, "noResolve", ["host"]],
  [/^Agent not reachable at (.+):(\d+) \((.+)\)$/, "agentUnreachable", ["host", "port", "kind"]],
  [/^the agent's certificate changed .*$/, "certChanged", []],
  [/^This server's agent is too old for preroute.*$/, "agentOldPreroute", []],
  [/^This server's agent is too old for iptables forwarding.*$/, "agentOldIptables", []],
  [/^no address$/, "noAddress", []],
  [/^Server not found$/, "serverNotFound", []],
  [/^Rule not found$/, "ruleNotFound", []],
  [/^A server can't forward to itself$/, "selfForward", []],
  [/^Pick the exit server for a WireGuard \/ AmneziaWG link$/, "pickExit", []],
  [/^(.+) is an exit for another rule; .*$/, "isExit", ["name"]],
  [/^(.+) is a relay in another rule; .*$/, "isRelay", ["name"]],
  [/^Can't find an IPv4 address for (.+)$/, "noIpv4", ["name"]],
  [/^Add at least one port$/, "addPort", []],
  [/^Port (\d+): enter the target IP or domain$/, "needTarget", ["port"]],
  [/^Port ([\d, ]+) is used by an inbound of (.+)'s Xray; pick another relay port$/, "portXray", ["ports", "name"]],
  [/^Port ([\d, ]+) of (.+) already goes to (.+) \(another rule\)$/, "portTaken", ["ports", "name", "target"]],
  [/^Port ([\d, ]+) is needed by (.+) itself .*$/, "portReserved", ["ports", "name"]],
  [/^UDP port (\d+) is already used on (.+)$/, "udpTaken", ["port", "name"]],
  [/^Too many rules$/, "tooMany", []],
  [/^SSH login failed.*$/, "sshLogin", []],
  [/^Can't connect to (.+):(\d+) over SSH .*$/, "sshConnect", ["host", "port"]],
  [/^The private key is encrypted.*$/, "keyEncrypted", []],
  [/^Can't read the private key.*$/, "keyBad", []],
  [/^Enter the VPS login.*$/, "needLogin", []],
  [/^The saved login can't be read anymore.*$/, "loginLost", []],
  [/^Nothing to install$/, "nothingToInstall", []],
  [/^command failed \((\d+)\): (.+)$/, "commandFailed", ["code", "command"]],
  [/^You can't edit external configs$/, "noExternal", []],
  [/^Use a full address like .*$/, "fullAddress", []],
  [/^Save the VPS login first.*$/, "needLoginTunnel", []],
  [/^Save the VPS login \(SSH\) of this node first.*$/, "needLoginTest", []],
  [/^No outbound or balancer "(.+)" in the core of (.+)$/, "noExitTag", ["tag", "name"]],
  [/^The node's CPU \((.+)\) differs from the panel's.*$/, "otherCpu", ["arch"]],
  [/^No Alexen node installation found on the VPS$/, "noNodeInstall", []],
  [/^The panel's Xray binary was not found$/, "noPanelXray", []],
  [/^The test URL must start with http.*$/, "badTestUrl", []],
  [/^No Xray found on the node$/, "noNodeXray", []],
  [/^curl is not installed on the node$/, "noCurl", []],
  [/^A server can't exit through itself$/, "exitSelf", []],
  [/^That makes a loop.*$/, "exitLoop", []],
  [/^Not a 3x-ui backup.*$/, "notXui", []],
  [/^Not an Alexen backup.*$/, "notBackup", []],
  [/^The backup's database is damaged$/, "backupDamaged", []],
  [/^This backup comes from a newer panel version.*$/, "backupNewer", []],
  [/^The backup contains an unsafe file path$|^Unexpected file in the backup.*$/, "backupUnsafe", []],
  [/^Incorrect username or password$/, "badLogin", []],
  [/^The updater isn't set up on this server/, "noUpdater", []],
  [/^Your admin account has expired$/, "adminExpired", []],
  [/^User limit reached \((\d+)\)$/, "userLimitReached", ["n"]],
  [/^Traffic quota reached$/, "trafficQuotaReached", []],
  [/^User already exists$/, "userExists", []],
  [/^Protocol (\S+) is disabled on your server$/, "protocolDisabled", ["protocol"]],
  [/^This doesn't look like a bot token/, "tgTokenBad", []],
  [/^Telegram rejected this token$/, "tgTokenRejected", []],
  [/^Enter the bot token first$/, "tgNeedToken", []],
  [/^Add at least one admin Telegram ID$/, "tgNeedAdmin", []],
  [/^An update is running already$/, "updateRunning", []],
  [/^Only the creator can add sudo admins$/, "onlyCreatorAdd", []],
  [/^Only the creator can change another sudo admin$/, "onlyCreatorChange", []],
  [/^Only the creator can make sudo admins$/, "onlyCreatorMake", []],
  [/^Only the creator can delete sudo admins$/, "onlyCreatorDelete", []],
  [/^The panel needs at least one creator.*$/, "needCreator", []],
  [/^You can't delete your own account$/, "noSelfDelete", []],
  [/^The database is busy or unavailable.*$/, "dbBusy", []],
  [/^It was changed or deleted at the same time.*$/, "concurrent", []],
  [/^Each user needs at least one proxy$/, "needProxy", []],
  [/^Too many failed logins: try again in (\d+) minutes$/, "tooManyLogins", ["min"]],
  [/^Pick the relay server$/, "pickRelay", []],
  [/^No tunnels picked$/, "noTunnelsPicked", []],
  [/Connection refused/i, "connRefused", []],
  [/timed? ?out|ConnectTimeout|Read timed out/i, "connTimeout", []],
  [/Name or service not known|getaddrinfo failed|nodename nor servname/i, "connResolve", []],
  [/certificate verify failed|SSLError|WRONG_VERSION_NUMBER/i, "connTls", []],
  [/^This license key doesn't exist$/, "licInvalid", []],
  [/^This license is in use on another server$/, "licBound", []],
  [/^This license has expired: renew it to get updates$/, "licExpiredUpdates", []],
  [/^This license has expired$/, "licExpired", []],
  [/^This license was cancelled$/, "licRevoked", []],
  [/^This license is suspended$|^This license isn't active$/, "licSuspended", []],
  [/^Too many tries: wait an hour$/, "licRate", []],
  [/^The license server can't be reached.*$|^couldn't reach the license server$/, "licUnreachable", []],
  [/^The license server's answer isn't signed correctly$/, "licBadCert", []],
  [/^Enter the license key$/, "licNeedKey", []],
  [/^The panel's license isn't active$/, "licLocked", []],
  [/^License limit reached: at most (\d+) users$/, "licLimitUsers", ["n"]],
  [/^License limit reached: at most (\d+) admins$/, "licLimitAdmins", ["n"]],
  [/^License limit reached: at most (\d+) nodes$/, "licLimitNodes", ["n"]],
  [/^no license key on this server: enter it in the panel$/, "licNoKey", []],
  [/^Pick a start and an end date$/, "pickRange", []],
  [/^Pick at most 400 days$/, "rangeLong", []],
];

export const serverMessage = (t: T, text?: string | null): string => {
  if (!text || typeof text !== "string") return text ? String(text) : "";
  // several errors joined by "; " (e.g. "awg: ...; tunnels: ...")
  if (text.includes("; ") && !RULES.some(([re]) => re.test(text)))
    return text.split("; ").map((p) => serverMessage(t, p)).join("; ");
  const prefix = text.match(/^(awg|ovpn|tunnels): (.*)$/);
  if (prefix) return `${prefix[1]}: ${serverMessage(t, prefix[2])}`;
  for (const [re, key, names] of RULES) {
    const m = text.match(re);
    if (m) {
      const params: Record<string, string> = {};
      names.forEach((n, i) => (params[n] = m[i + 1]));
      return t(`serverMsg.${key}`, params);
    }
  }
  return text;
};

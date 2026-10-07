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

export interface ParsedDsn {
  hostname: string;
  uuid: string;
  account: string;
  project: string;
  endpointUrl: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDsn(dsn: string): ParsedDsn | null {
  if (typeof dsn !== 'string') return null;
  const parts = dsn.split(':');
  if (parts.length !== 4) return null;
  const [hostname, uuid, account, project] = parts;
  if (!hostname || !uuid || !account || !project) return null;
  if (!UUID_RE.test(uuid)) return null;
  const endpointUrl = `https://${hostname}/dwlog/event/${account}/${project}/${uuid}`;
  return { hostname, uuid, account, project, endpointUrl };
}

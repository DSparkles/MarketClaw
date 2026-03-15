import { HTTP_LIMITS } from "../config";

export async function readCapped(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) {
    return await res.text();
  }
  const decoder = new TextDecoder();
  let result = "";
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > HTTP_LIMITS.maxResponseBytes) {
      await reader.cancel();
      return null;
    }
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

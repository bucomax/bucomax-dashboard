export function waDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

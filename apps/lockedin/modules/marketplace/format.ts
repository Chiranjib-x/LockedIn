export function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN").format(n);
}

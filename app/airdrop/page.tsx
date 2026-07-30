import { redirect } from "next/navigation";

/** Old path — keep so bookmarks don't 404 */
export default function AirdropRedirect() {
  redirect("/xtzairdrop");
}

import { useRef, useState } from "react";
import { App, Dropdown } from "antd";
import { CameraFilled, PictureOutlined, CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { userService } from "../../services/userService.js";
import { shrinkImage } from "../../utils/shrinkImage.js";
import UserAvatar from "../ui/UserAvatar.jsx";

/**
 * The signed-in user's avatar with a camera badge. Clicking it offers
 * Upload photo / Take photo / Remove photo. Any picture works: it's shrunk
 * in the browser, sent, and the server stores a small square copy. The new
 * photo shows everywhere straight away (it's on the signed-in user).
 */
export default function ProfilePhotoPicker({ size = 96 }) {
  const { user, setUser } = useAuth();
  const { message } = App.useApp();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be picked again
    if (!file) return;
    setBusy(true);
    try {
      const small = (await shrinkImage(file)) || file;
      setUser(await userService.uploadPhoto(small));
      message.success("Profile photo updated");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      setUser(await userService.removePhoto());
      message.success("Profile photo removed");
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const items = [
    { key: "upload", icon: <PictureOutlined />, label: "Upload photo", onClick: () => galleryRef.current?.click() },
    { key: "camera", icon: <CameraOutlined />, label: "Take photo", onClick: () => cameraRef.current?.click() },
    ...(user?.profileImage ? [{ key: "remove", icon: <DeleteOutlined />, label: "Remove photo", danger: true, onClick: remove }] : []),
  ];

  return (
    <>
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottom" disabled={busy}>
        <button type="button" className={`ppp-btn${busy ? " ppp-busy" : ""}`} aria-label="Change profile photo" style={{ width: size, height: size }}>
          <UserAvatar user={user} size={size} className="ppp-avatar" />
          <span className="ppp-badge"><CameraFilled /></span>
          {busy && <span className="ppp-spin" />}
        </button>
      </Dropdown>
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={upload} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={upload} />
      <style>{`
        .ppp-btn{position:relative;padding:0;border:0;background:none;border-radius:50%;cursor:pointer}
        .ppp-btn:focus-visible{outline:2px solid #2DD4BF;outline-offset:3px}
        .ppp-avatar{background:linear-gradient(135deg,#2DD4BF,#60A5FA)!important;color:#04110f!important;font-weight:800;font-size:${Math.round(size * 0.38)}px!important;transition:filter .2s}
        .ppp-btn:hover .ppp-avatar{filter:brightness(.85)}
        .ppp-badge{position:absolute;right:2px;bottom:2px;width:${Math.max(24, size * 0.3)}px;height:${Math.max(24, size * 0.3)}px;border-radius:50%;display:grid;place-items:center;background:#2DD4BF;color:#04110f;border:3px solid var(--bg-primary);font-size:${Math.max(11, size * 0.13)}px}
        .ppp-spin{position:absolute;inset:-4px;border-radius:50%;border:3px solid transparent;border-top-color:#2DD4BF;border-right-color:#8B5CF6;animation:pppSpin .8s linear infinite}
        .ppp-busy .ppp-avatar{filter:brightness(.7)}
        @keyframes pppSpin{to{transform:rotate(360deg)}}
      `}</style>
    </>
  );
}

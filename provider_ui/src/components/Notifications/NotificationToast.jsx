import { toast } from "react-toastify";
import { useEffect } from "react";
import { socket } from "../../socket";

const NotificationToast = () => {
  useEffect(() => {
    socket.on("notification", (data) => {
      toast.info(data.message);
    });

    return () => socket.off("notification");
  }, []);

  return null;
};

export default NotificationToast;

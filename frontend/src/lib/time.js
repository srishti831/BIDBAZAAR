// The browser clock can be minutes off. The API sends its own time with every
// response, so countdowns and "is it live?" checks use the server's clock.
let offset = 0;

export const syncServerTime = (serverTime) => {
  const t = new Date(serverTime).getTime();
  if (Number.isFinite(t)) offset = t - Date.now();
};

export const serverNow = () => Date.now() + offset;

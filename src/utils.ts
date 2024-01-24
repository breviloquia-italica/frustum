export const ramp = function (color: (t: number) => string, n = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = n;
  const context = canvas.getContext("2d")!;
  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1));
    context.fillRect(0, n - 1 - i, 1, 1);
  }
  return canvas;
};

import { createCanvas } from 'canvas';
import fs from 'fs';

const size = 512;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

const bgColor = '#090d16';
const accentColor = '#38bdf8';
const accentLight = '#7dd3fc';
const accentDark = '#0ea5e9';
const nodeColor = '#1e293b';
const nodeBorder = '#334155';

const centerX = size / 2;
const centerY = size / 2;

ctx.fillStyle = bgColor;
ctx.fillRect(0, 0, size, size);

function drawGlow(x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawNode(x, y, radius, fillColor, borderColor, borderWidth) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();
}

function drawConnection(x1, y1, x2, y2, color, width, dash) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  else ctx.setLineDash([]);
  ctx.stroke();
  ctx.setLineDash([]);
}

ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
ctx.lineWidth = 1;
for (let i = 0; i <= size; i += 32) {
  ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
}

drawGlow(centerX, centerY, 200, 'rgba(56, 189, 248, 0.08)');

const rootRadius = 28;
const rootX = centerX;
const rootY = centerY - 60;

const level1Radius = 20;
const level1Y = centerY + 20;
const level1Positions = [
  { x: centerX - 100, y: level1Y },
  { x: centerX, y: level1Y - 10 },
  { x: centerX + 100, y: level1Y },
];

const level2Radius = 14;
const level2Positions = [
  { x: centerX - 150, y: centerY + 100 },
  { x: centerX - 50, y: centerY + 100 },
  { x: centerX - 30, y: centerY + 100 },
  { x: centerX + 30, y: centerY + 100 },
  { x: centerX + 50, y: centerY + 100 },
  { x: centerX + 150, y: centerY + 100 },
];

const level3Radius = 10;
const level3Positions = [
  { x: centerX - 170, y: centerY + 170 },
  { x: centerX - 130, y: centerY + 170 },
  { x: centerX - 70, y: centerY + 170 },
  { x: centerX - 10, y: centerY + 170 },
  { x: centerX + 50, y: centerY + 170 },
  { x: centerX + 110, y: centerY + 170 },
  { x: centerX + 170, y: centerY + 170 },
];

level1Positions.forEach(pos => {
  drawConnection(rootX, rootY + rootRadius, pos.x, pos.y - level1Radius, accentColor, 3);
});

drawConnection(level1Positions[0].x, level1Positions[0].y + level1Radius, level2Positions[0].x, level2Positions[0].y - level2Radius, accentColor, 2);
drawConnection(level1Positions[0].x, level1Positions[0].y + level1Radius, level2Positions[1].x, level2Positions[1].y - level2Radius, accentColor, 2);
drawConnection(level1Positions[1].x, level1Positions[1].y + level1Radius, level2Positions[2].x, level2Positions[2].y - level2Radius, accentColor, 2);
drawConnection(level1Positions[1].x, level1Positions[1].y + level1Radius, level2Positions[3].x, level2Positions[3].y - level2Radius, accentColor, 2);
drawConnection(level1Positions[2].x, level1Positions[2].y + level1Radius, level2Positions[4].x, level2Positions[4].y - level2Radius, accentColor, 2);
drawConnection(level1Positions[2].x, level1Positions[2].y + level1Radius, level2Positions[5].x, level2Positions[5].y - level2Radius, accentColor, 2);

drawConnection(level2Positions[0].x, level2Positions[0].y + level2Radius, level3Positions[0].x, level3Positions[0].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[0].x, level2Positions[0].y + level2Radius, level3Positions[1].x, level3Positions[1].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[1].x, level2Positions[1].y + level2Radius, level3Positions[1].x, level3Positions[1].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[1].x, level2Positions[1].y + level2Radius, level3Positions[2].x, level3Positions[2].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[2].x, level2Positions[2].y + level2Radius, level3Positions[2].x, level3Positions[2].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[2].x, level2Positions[2].y + level2Radius, level3Positions[3].x, level3Positions[3].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[3].x, level2Positions[3].y + level2Radius, level3Positions[3].x, level3Positions[3].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[3].x, level2Positions[3].y + level2Radius, level3Positions[4].x, level3Positions[4].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[4].x, level2Positions[4].y + level2Radius, level3Positions[4].x, level3Positions[4].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[4].x, level2Positions[4].y + level2Radius, level3Positions[5].x, level3Positions[5].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[5].x, level2Positions[5].y + level2Radius, level3Positions[5].x, level3Positions[5].y - level3Radius, accentColor, 1.5);
drawConnection(level2Positions[5].x, level2Positions[5].y + level2Radius, level3Positions[6].x, level3Positions[6].y - level3Radius, accentColor, 1.5);

ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
ctx.lineWidth = 1.5;
ctx.setLineDash([8, 8]);
drawConnection(level1Positions[0].x, level1Positions[0].y, level1Positions[1].x, level1Positions[1].y, 'rgba(56, 189, 248, 0.15)', 1.5, [8, 8]);
drawConnection(level1Positions[1].x, level1Positions[1].y, level1Positions[2].x, level1Positions[2].y, 'rgba(56, 189, 248, 0.15)', 1.5, [8, 8]);
drawConnection(level2Positions[0].x, level2Positions[0].y, level2Positions[1].x, level2Positions[1].y, 'rgba(56, 189, 248, 0.1)', 1, [6, 6]);
drawConnection(level2Positions[2].x, level2Positions[2].y, level2Positions[3].x, level2Positions[3].y, 'rgba(56, 189, 248, 0.1)', 1, [6, 6]);
drawConnection(level2Positions[4].x, level2Positions[4].y, level2Positions[5].x, level2Positions[5].y, 'rgba(56, 189, 248, 0.1)', 1, [6, 6]);
ctx.setLineDash([]);

level3Positions.forEach((pos, i) => {
  const isEven = i % 2 === 0;
  drawNode(pos.x, pos.y, level3Radius, isEven ? nodeColor : accentColor, isEven ? nodeBorder : accentDark, isEven ? 1.5 : 2);
});

level2Positions.forEach((pos, i) => {
  const isAccent = i % 3 === 1;
  drawNode(pos.x, pos.y, level2Radius, isAccent ? accentColor : nodeColor, isAccent ? accentDark : nodeBorder, isAccent ? 2.5 : 2);
});

level1Positions.forEach((pos, i) => {
  const isCenter = i === 1;
  drawNode(pos.x, pos.y, level1Radius, isCenter ? accentColor : nodeColor, isCenter ? accentDark : nodeBorder, isCenter ? 3 : 2.5);
  if (isCenter) {
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2); ctx.fillStyle = bgColor; ctx.fill();
  }
});

drawNode(rootX, rootY, rootRadius, accentColor, accentLight, 3);
ctx.beginPath(); ctx.arc(rootX, rootY, rootRadius - 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; ctx.fill();
ctx.beginPath(); ctx.arc(rootX, rootY, 8, 0, Math.PI * 2); ctx.fillStyle = bgColor; ctx.fill();

const badgeX = size - 60;
const badgeY = 60;
const badgeRadius = 24;
ctx.beginPath(); ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(9, 13, 22, 0.9)'; ctx.fill();
ctx.strokeStyle = accentColor; ctx.lineWidth = 2; ctx.stroke();
ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillStyle = accentColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MCP', badgeX, badgeY - 2);
ctx.strokeStyle = accentColor; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
ctx.beginPath(); ctx.moveTo(badgeX - 8, badgeY + 6); ctx.lineTo(badgeX - 2, badgeY + 10); ctx.lineTo(badgeX - 8, badgeY + 14); ctx.stroke();
ctx.beginPath(); ctx.moveTo(badgeX + 8, badgeY + 6); ctx.lineTo(badgeX + 2, badgeY + 10); ctx.lineTo(badgeX + 8, badgeY + 14); ctx.stroke();

ctx.font = '500 14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(226, 232, 240, 0.5)'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('MCP Tree-sitter', centerX, size - 20);
ctx.font = '400 11px monospace'; ctx.fillStyle = 'rgba(226, 232, 240, 0.3)'; ctx.fillText('Server / Studio', centerX, size - 8);

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('logo.png', buffer);
console.log('Logo generated: logo.png (512x512)');

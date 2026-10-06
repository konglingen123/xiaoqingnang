"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const zones = [
  ["head", "头面部", 50, 9],
  ["neck", "颈部", 50, 18],
  ["chest", "胸部", 50, 29],
  ["abdomen", "腹部", 50, 42],
  ["lower-back", "腰背部", 50, 54],
  ["pelvis", "骨盆", 50, 64],
  ["knee", "膝部", 39, 80],
  ["knee", "膝部", 61, 80],
  ["foot", "足部", 39, 96],
  ["foot", "足部", 61, 96],
] as const;
const faceZones = [
  ["forehead", "额部"],
  ["eye", "眼周"],
  ["nose", "鼻部"],
  ["cheek", "面颊"],
  ["mouth", "口唇周围"],
  ["jaw", "下颌部"],
] as const;
const sensitiveZones = [
  ["breast", "乳房", "胸部细分"],
  ["nipple-areola", "乳头及乳晕", "胸部细分"],
  ["vulva", "外阴", "外部结构"],
  ["perineum", "会阴", "骨盆底区域"],
  ["anus", "肛门及肛周", "背面区域"],
] as const;
export default function BodyFigure() {
  const [side, setSide] = useState<"front" | "back">("front");
  const [structure, setStructure] = useState<"common" | "female" | "male">(
    "common",
  );
  const [selected, setSelected] = useState<(typeof zones)[number] | null>(null);
  const [faceOpen, setFaceOpen] = useState(false);
  const [face, setFace] = useState<string | null>(null);
  const [sensitive, setSensitive] = useState<string | null>(null);
  const router = useRouter();
  function open() {
    if (!selected) return;
    router.push(
      `/chat?areaId=${selected[0]}&areaName=${encodeURIComponent(selected[1])}`,
    );
  }
  function openFace() {
    setFace(null);
    setFaceOpen(true);
  }
  function openFaceSearch() {
    if (face)
      router.push(
        `/chat?areaId=${face}&areaName=${encodeURIComponent(faceZones.find((x) => x[0] === face)?.[1] || "头面部")}`,
      );
  }
  function openSensitiveSearch() {
    if (!sensitive) return;
    const zone = sensitiveZones.find((item) => item[0] === sensitive);
    router.push(
      `/chat?areaId=${sensitive}&areaName=${encodeURIComponent(zone?.[1] || "身体部位")}`,
    );
  }
  if (structure !== "common")
    return (
      <div className="body-figure-widget">
        <div className="face-select-head">
          <button onClick={() => setStructure("common")}>‹ 通用人体</button>
          <strong>{structure === "female" ? "女性局部" : "男性局部"}</strong>
          <i />
        </div>
        <div className="sensitive-notice">以下仅用于准确选择身体位置</div>
        <div className="sensitive-grid-next">
          {sensitiveZones
            .filter((zone) => structure === "female" || zone[0] !== "vulva")
            .map((zone) => (
              <button
                key={zone[0]}
                className={sensitive === zone[0] ? "selected" : ""}
                onClick={() => setSensitive(zone[0])}
              >
                <b>{zone[1]}</b>
                <small>{zone[2]}</small>
              </button>
            ))}
        </div>
        {sensitive ? (
          <div className="body-selection">
            <div>
              <small>已选择</small>
              <strong>
                {sensitiveZones.find((item) => item[0] === sensitive)?.[1]}
              </strong>
            </div>
            <button onClick={openSensitiveSearch}>查看内容 ›</button>
          </div>
        ) : (
          <div className="body-hint">请选择一个准确位置</div>
        )}
      </div>
    );
  if (selected?.[0] === "head" && faceOpen)
    return (
      <div className="body-figure-widget">
        <div className="face-select-head">
          <button onClick={() => setFaceOpen(false)}>‹ 返回全身</button>
          <strong>选择头面位置</strong>
          <i />
        </div>
        <div className="face-select-canvas">
          <img src="/body/face-front-model.jpg" alt="头面部示意图" />
          {faceZones.map(([id, name], i) => (
            <button
              key={id}
              className={`face-zone-button ${face === id ? "selected" : ""}`}
              style={{ top: `${18 + i * 13}%`, left: i % 2 ? "68%" : "32%" }}
              onClick={() => setFace(id)}
            >
              {name}
            </button>
          ))}
        </div>
        {face ? (
          <div className="body-selection">
            <div>
              <small>已选择</small>
              <strong>{faceZones.find((x) => x[0] === face)?.[1]}</strong>
            </div>
            <button onClick={openFaceSearch}>查看内容 ›</button>
          </div>
        ) : (
          <div className="body-hint">点击标注或面部位置</div>
        )}
      </div>
    );
  return (
    <div className="body-figure-widget">
      <div className="body-figure-controls">
        <div>
          <span>身体结构</span>
          <button
            className={structure === "common" ? "on" : ""}
            onClick={() => setStructure("common")}
          >
            通用
          </button>
          <button
            className={(structure as string) === "female" ? "on" : ""}
            onClick={() => setStructure("female")}
          >
            女性
          </button>
          <button
            className={(structure as string) === "male" ? "on" : ""}
            onClick={() => setStructure("male")}
          >
            男性
          </button>
        </div>
        <div>
          <button
            className={side === "front" ? "on" : ""}
            onClick={() => setSide("front")}
          >
            正面
          </button>
          <button
            className={side === "back" ? "on" : ""}
            onClick={() => setSide("back")}
          >
            背面
          </button>
        </div>
      </div>
      <div className="body-figure-canvas">
        <img
          src={
            side === "front" ? "/body/body-front.svg" : "/body/body-back.svg"
          }
          alt={`${side === "front" ? "正面" : "背面"}人体示意图`}
        />
        {zones.map((z, i) => (
          <button
            key={`${z[0]}-${i}`}
            className={`body-zone ${selected === z ? "selected" : ""}`}
            style={{ left: `${z[2]}%`, top: `${z[3]}%` }}
            aria-label={z[1]}
            onClick={() => (z[0] === "head" ? setSelected(z) : setSelected(z))}
          />
        ))}
      </div>
      {selected ? (
        <div className="body-selection">
          <div>
            <small>已选择</small>
            <strong>{selected[1]}</strong>
          </div>
          <button onClick={selected[0] === "head" ? openFace : open}>
            查看内容 ›
          </button>
        </div>
      ) : (
        <div className="body-hint">点击一个身体位置</div>
      )}
    </div>
  );
}

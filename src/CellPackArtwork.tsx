/** Concept product render; not a photograph of a specific customer model. */
export default function CellPackArtwork(){
 return <img className="cell-pack-art" src={`${import.meta.env.BASE_URL}brand/cell-pack-studio.png`} alt="배터리 셀과 완성된 8셀 팩 제품의 개념 이미지" width="1920" height="800" decoding="async" fetchPriority="high"/>;
}

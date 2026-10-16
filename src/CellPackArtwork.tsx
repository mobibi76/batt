/** Concept illustration: individual LFP cells and an enclosed eight-cell pack. */
export default function CellPackArtwork(){
 return <svg className="cell-pack-art" viewBox="0 0 560 230" role="img" aria-label="개별 배터리 셀에서 8셀 팩 제품으로 이어지는 모습">
  <defs>
   <linearGradient id="cell-metal" x2="1" y2="0"><stop stopColor="#77968b"/><stop offset=".22" stopColor="#c1d0ba"/><stop offset=".65" stopColor="#9fb7a3"/><stop offset="1" stopColor="#6e8e7c"/></linearGradient>
   <linearGradient id="pack-front" x2=".8" y2="1"><stop stopColor="#36584a"/><stop offset="1" stopColor="#182f29"/></linearGradient>
   <linearGradient id="pack-top" x2="1" y2="1"><stop stopColor="#6c8470"/><stop offset="1" stopColor="#344f40"/></linearGradient>
   <filter id="product-shadow" x="-30%" y="-30%" width="170%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
   <g id="prismatic-cell">
    <path d="M0 20 26 6 85 17 59 33Z" fill="#ccdac7" stroke="#91aa92" strokeWidth=".7"/>
    <path d="M59 33 85 17 85 142 59 160Z" fill="#527562" stroke="#86a18a" strokeWidth=".7"/>
    <path d="M0 20 59 33 59 160 0 146Z" fill="url(#cell-metal)" stroke="#b6c9ac" strokeWidth=".8"/>
    <path d="M5 28 54 39M5 138 54 150" stroke="#e1e9d6" strokeOpacity=".35"/>
    <path d="M17 12v-8l10-5 9 3v8l-10 6Z" fill="#bacab9" stroke="#e0e8d4" strokeWidth=".7"/>
    <path d="M54 18v-8l10-5 9 3v8l-10 6Z" fill="#718d78" stroke="#c3d3bc" strokeWidth=".7"/>
    <path d="m17 4 10 3 9-5M27 7v9M54 10l9 3 10-5M63 13v9" fill="none" stroke="#edf0da" strokeOpacity=".6"/>
    <path d="m12 64 35 8v45l-35-8Z" fill="#284a3a" fillOpacity=".65"/>
    <text x="20" y="88" transform="rotate(12 20 88)" fill="#e5ebd6" fontSize="11" fontWeight="600" letterSpacing="2">LFP</text>
    <path d="m19 98 20 4m-20 2 14 3" stroke="#a6bca1" strokeWidth="1"/>
   </g>
  </defs>
  <ellipse cx="104" cy="182" rx="87" ry="13" fill="#071e18" opacity=".55" filter="url(#product-shadow)"/>
  <ellipse cx="408" cy="185" rx="119" ry="16" fill="#071e18" opacity=".6" filter="url(#product-shadow)"/>
  <use href="#prismatic-cell" transform="translate(91 21) scale(.81)" opacity=".8"/>
  <use href="#prismatic-cell" transform="translate(34 28)"/>
  <path d="M190 108h52m-8-6 8 6-8 6" fill="none" stroke="#a5ba96" strokeWidth="1.3" opacity=".65"/>
  <g strokeLinejoin="round">
   <path d="M282 66 358 31 515 63 439 102Z" fill="url(#pack-top)" stroke="#82967b"/>
   <path d="M439 102 515 63 515 152 439 193Z" fill="#19392d" stroke="#58765c"/>
   <path d="M282 66 439 102 439 193 282 153Z" fill="url(#pack-front)" stroke="#789276"/>
   <path d="M282 76 439 112 515 74" fill="none" stroke="#a3b296" strokeOpacity=".5"/>
   <path d="m296 64 62-27 141 28-61 31Z" fill="none" stroke="#a8b597" strokeOpacity=".35"/>
   <path d="M353 58V39q0-5 6-4l55 11q5 1 5 6v19" fill="none" stroke="#203b30" strokeWidth="8"/>
   <path d="M354 53V40q0-3 4-2l55 11q3 1 3 4v14" fill="none" stroke="#90a28a" strokeWidth="1.2"/>
   <path d="m301 99 77 18v45l-77-19Z" fill="#153228" stroke="#617e65" strokeWidth=".6"/>
   <text x="312" y="122" transform="rotate(13 312 122)" fill="#e4e9d6" fontSize="17" fontWeight="650" letterSpacing="2">JSI</text>
   <text x="312" y="139" transform="rotate(13 312 139)" fill="#b7c6a9" fontSize="8" letterSpacing="1.3">8S1P / LFP</text>
   <path d="m398 137 23 5m-23 2 23 5m-23 2 23 5" stroke="#82977c" strokeWidth="1" opacity=".55"/>
   <path d="m470 112 22-11v22l-22 12Z" fill="#10281f" stroke="#8ba082"/>
   <circle cx="478" cy="116" r="3" fill="#b8bca0"/><circle cx="486" cy="112" r="3" fill="#7d8d78"/>
   {[ [290,84],[430,117],[290,145],[430,181] ].map(([x,y])=><circle key={x+','+y} cx={x} cy={y} r="1.6" fill="#9dac91"/>)}
   <path d="m289 154 12 3v7l-12-3Zm130 33 13 3v7l-13-3Z" fill="#10271e"/>
  </g>
  <g fill="#b1c5ab" fontSize="10" letterSpacing="2"><text x="90" y="222" textAnchor="middle">배터리 셀</text><text x="400" y="222" textAnchor="middle">8셀 팩 제품</text></g>
 </svg>;
}

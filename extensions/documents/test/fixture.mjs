// Builds the test template: a school's .docx in Spanish, made by hand the way Word saves one - localized style names
// ("Título 1", "Párrafo de lista"), a custom table style, a numbering part, a header with a logo and a placeholder
// split across runs, a footer with another, a cover line before a {{content}} marker and a signature after it.
import { deflateSync } from "node:zlib";
import { strToU8, zipSync } from "fflate";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A solid-color PNG of width x height pixels. */
export function png(width, height, rgb = [229, 72, 58]) {
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const logo = `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="720000" cy="720000"/><wp:docPr id="7" name="Logo" descr="Logo del centro"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="7" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="720000" cy="720000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

/** The template's files; `dotx` saves it as a Word template (.dotx) instead. */
export function templateFiles({ dotx = false, marker = true } = {}) {
  const main = dotx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
  const styles = [
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults>`,
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`,
    `<w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="Título 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="32"/></w:rPr></w:style>`,
    `<w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="Título 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="2F5496"/><w:sz w:val="26"/></w:rPr></w:style>`,
    `<w:style w:type="paragraph" w:styleId="Prrafodelista"><w:name w:val="Párrafo de lista"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>`,
    `<w:style w:type="paragraph" w:styleId="Encabezado"><w:name w:val="header"/><w:basedOn w:val="Normal"/></w:style>`,
    `<w:style w:type="character" w:default="1" w:styleId="Fuentedeprrafopredeter"><w:name w:val="Default Paragraph Font"/><w:semiHidden/></w:style>`,
    `<w:style w:type="character" w:styleId="Hipervnculo"><w:name w:val="Hipervínculo"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>`,
    `<w:style w:type="table" w:default="1" w:styleId="Tablanormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>`,
    `<w:style w:type="table" w:customStyle="1" w:styleId="TablaInstituto"><w:name w:val="Tabla Instituto"/><w:basedOn w:val="Tablanormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="8" w:color="1F3864"/><w:bottom w:val="single" w:sz="8" w:color="1F3864"/><w:insideH w:val="single" w:sz="4" w:color="8EAADB"/></w:tblBorders></w:tblPr><w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1F3864"/></w:tcPr></w:tblStylePr></w:style>`,
  ].join("");
  const numbering = `<w:numbering ${W}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperRoman"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
  const header = `<w:hdr ${W}><w:p><w:pPr><w:pStyle w:val="Encabezado"/></w:pPr>${logo}<w:r><w:t xml:space="preserve"> {{cen</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>tro}}</w:t></w:r></w:p></w:hdr>`;
  const footer = `<w:ftr ${W}><w:p><w:r><w:t>Curso {{ curso }}</w:t></w:r></w:p></w:ftr>`;
  const body = [
    `<w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t xml:space="preserve">Memoria de </w:t></w:r><w:r><w:t>{{mó</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>dulo}</w:t></w:r><w:r><w:t>}</w:t></w:r></w:p>`,
    `<w:p><w:r><w:t>Texto de ejemplo de la plantilla.</w:t></w:r></w:p>`,
    marker ? `<w:p><w:r><w:t>{{con</w:t></w:r><w:r><w:t>tent}}</w:t></w:r></w:p>` : "",
    `<w:p><w:r><w:t xml:space="preserve">Firmado: {{profesor}}</w:t></w:r></w:p>`,
  ].join("");
  const sectPr = `<w:sectPr><w:headerReference w:type="default" r:id="rId8"/><w:footerReference w:type="default" r:id="rId9"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`;
  return {
    "[Content_Types].xml": strToU8(`${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="${main}"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`),
    "word/_rels/document.xml.rels": strToU8(`${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`),
    "word/_rels/header1.xml.rels": strToU8(`${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>`),
    "word/document.xml": strToU8(`${DECL}<w:document ${W}><w:body>${body}${sectPr}</w:body></w:document>`),
    "word/styles.xml": strToU8(`${DECL}<w:styles ${W}>${styles}</w:styles>`),
    "word/numbering.xml": strToU8(DECL + numbering),
    "word/header1.xml": strToU8(DECL + header),
    "word/footer1.xml": strToU8(DECL + footer),
    "word/media/logo.png": new Uint8Array(png(64, 64, [31, 56, 100])),
    "docProps/core.xml": strToU8(`${DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Plantilla</dc:title></cp:coreProperties>`),
  };
}

export const templateBytes = (options) => zipSync(templateFiles(options));

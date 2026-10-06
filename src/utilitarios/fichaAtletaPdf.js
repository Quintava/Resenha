const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 42;
const TOP = 800;
const BOTTOM = 42;

const latin1 = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");

const escapePdf = (value) =>
  latin1(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const wrap = (text, max = 88) => {
  const words = latin1(text || "-").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
};

const buildPdf = (pages) => {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontRegularId = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fontBoldId = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const pageIds = [];

  pages.forEach((content) => {
    const streamId = addObject(
      `<< /Length ${latin1(content).length} >>\nstream\n${content}\nendstream`,
    );
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${streamId} 0 R >>`,
    );
    pageIds.push(pageId);
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(latin1(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = latin1(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array([...latin1(pdf)].map((char) => char.charCodeAt(0)));
};

const createPdf = (documentTitle, rows) => {
  const pages = [];
  let commands = [];
  let y = TOP;
  let pageNumber = 0;

  const newPage = () => {
    if (commands.length) pages.push(commands.join("\n"));
    commands = [];
    pageNumber += 1;
    commands.push(`0.055 0.31 0.235 rg 0 768 ${PAGE_WIDTH} 74 re f`);
    commands.push(`BT 1 1 1 rg /F2 17 Tf ${LEFT} 808 Td (${escapePdf(documentTitle)}) Tj ET`);
    commands.push(
      `BT 0.78 0.93 0.87 rg /F1 7.5 Tf ${LEFT} 789 Td (${escapePdf("Documento interno · dados técnicos e de segurança")}) Tj ET`,
    );
    commands.push(
      `BT 0.45 0.5 0.49 rg /F1 6.5 Tf ${LEFT} 28 Td (${escapePdf("Informações confidenciais · acesso restrito à administração")}) Tj ET`,
    );
    commands.push(
      `BT 0.45 0.5 0.49 rg /F1 6.5 Tf 520 28 Td (${escapePdf(String(pageNumber))}) Tj ET`,
    );
    y = 746;
  };

  const ensureSpace = (height = 18) => {
    if (y - height < BOTTOM) newPage();
  };

  newPage();
  rows.forEach((row) => {
    if (row.type === "space") {
      y -= row.size || 10;
      return;
    }
    if (row.type === "section") {
      ensureSpace(34);
      y -= 5;
      commands.push(`0.9 0.95 0.93 rg ${LEFT} ${y - 17} ${PAGE_WIDTH - LEFT * 2} 22 re f`);
      commands.push(`0.08 0.43 0.32 rg ${LEFT} ${y - 17} 4 22 re f`);
      commands.push(
        `BT 0.08 0.32 0.25 rg /F2 9 Tf ${LEFT + 12} ${y - 11} Td (${escapePdf(row.text)}) Tj ET`,
      );
      y -= 31;
      return;
    }
    const lines = wrap(row.value, row.blank ? 74 : 76);
    const rowHeight = Math.max(29, lines.length * 13 + 14);
    ensureSpace(rowHeight + 4);
    commands.push(
      `0.79 0.83 0.81 RG 0.55 w ${LEFT} ${y - rowHeight + 7} ${PAGE_WIDTH - LEFT * 2} ${rowHeight} re S`,
    );
    commands.push(`0.97 0.98 0.98 rg ${LEFT + 1} ${y - 7} ${PAGE_WIDTH - LEFT * 2 - 2} 13 re f`);
    commands.push(
      `BT 0.32 0.39 0.37 rg /F2 6.8 Tf ${LEFT + 8} ${y - 3} Td (${escapePdf(row.label.toUpperCase())}) Tj ET`,
    );
    lines.forEach((line, index) => {
      const content = row.blank ? "_".repeat(Math.max(22, 79 - row.label.length)) : line;
      commands.push(
        `BT 0.12 0.16 0.15 rg /F1 8.5 Tf ${LEFT + 8} ${y - 19 - index * 13} Td (${escapePdf(content)}) Tj ET`,
      );
    });
    y -= rowHeight + 5;
  });
  pages.push(commands.join("\n"));
  return buildPdf(pages);
};

const createProfessionalBlankForm = () => {
  const commands = [];
  const text = (value, x, y, size = 9, bold = false, color = "0.12 0.16 0.15") => {
    commands.push(
      `BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`,
    );
  };
  const box = (label, x, y, width, height = 38) => {
    commands.push(`0.78 0.82 0.8 RG 0.6 w ${x} ${y - height} ${width} ${height} re S`);
    commands.push(`0.97 0.98 0.98 rg ${x + 1} ${y - 14} ${width - 2} 13 re f`);
    text(label.toUpperCase(), x + 7, y - 10, 6.8, true, "0.32 0.39 0.37");
  };
  const sectionBar = (title, y) => {
    commands.push(`0.9 0.95 0.93 rg ${LEFT} ${y - 19} ${PAGE_WIDTH - LEFT * 2} 22 re f`);
    commands.push(`0.08 0.43 0.32 rg ${LEFT} ${y - 19} 4 22 re f`);
    text(title.toUpperCase(), LEFT + 12, y - 13, 9, true, "0.08 0.32 0.25");
  };
  const checkbox = (label, x, y) => {
    commands.push(`0.35 0.42 0.4 RG 0.7 w ${x} ${y - 8} 9 9 re S`);
    text(label, x + 15, y - 7, 7.5);
  };

  // Cabeçalho do documento.
  commands.push(`0.06 0.35 0.27 rg 0 775 ${PAGE_WIDTH} 67 re f`);
  text("FICHA DE CADASTRO DO ALUNO", LEFT, 808, 17, true, "1 1 1");
  text("Preenchimento do responsável", LEFT, 789, 8, false, "0.82 0.93 0.89");
  commands.push(`0.08 0.43 0.32 rg 430 786 123 36 re f`);
  text("DATA DA MATRÍCULA", 440, 810, 6.5, true, "0.82 0.93 0.89");
  text("____ / ____ / ______", 440, 794, 9, false, "1 1 1");

  sectionBar("Dados do aluno", 756);
  box("Nome completo", 42, 725, 511);
  box("Apelido", 42, 679, 180);
  box("E-mail", 230, 679, 323);
  box("Data de nascimento", 42, 633, 180);
  box("Idade", 230, 633, 100);
  box("Categoria", 338, 633, 215);
  box("Posição principal", 42, 587, 249);
  box("Posição secundária", 304, 587, 249);
  box("Pé dominante", 42, 541, 155);
  box("Altura (m)", 205, 541, 170);
  box("Peso (kg)", 383, 541, 170);
  sectionBar("Saúde e segurança", 477);
  box("Restrições médicas", 42, 446, 249, 54);
  box("Alergias", 304, 446, 249, 54);
  box("Tipo sanguíneo", 42, 384, 140);
  box("Medicamentos contínuos", 190, 384, 363);
  box("Contato de emergência / responsável", 42, 338, 315);
  box("Telefone", 365, 338, 188);

  sectionBar("Declaração e assinatura", 282);
  text(
    "Declaro que as informações acima são verdadeiras e autorizo o uso destes dados para fins de cadastro,",
    48,
    247,
    7.2,
  );
  text(
    "organização esportiva e atendimento em situações de emergência, respeitada a confidencialidade.",
    48,
    235,
    7.2,
  );
  commands.push(`0.45 0.5 0.49 RG 0.6 w 48 158 m 300 158 l S`);
  commands.push(`0.45 0.5 0.49 RG 0.6 w 325 158 m 547 158 l S`);
  text("Assinatura do responsável", 48, 144, 7, true, "0.32 0.39 0.37");
  text("Data", 325, 144, 7, true, "0.32 0.39 0.37");
  text("Documento de uso interno · informações confidenciais", 42, 49, 6.5, false, "0.45 0.5 0.49");
  text("1 / 1", 528, 49, 6.5, false, "0.45 0.5 0.49");

  return buildPdf([commands.join("\n")]);
};

const download = (bytes, filename) => {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const field = (label, value) => ({ label, value: value || "-" });
const section = (text) => ({ type: "section", text });

export const downloadBlankStudentForm = () => {
  download(createProfessionalBlankForm(), "ficha-cadastro-aluno.pdf");
};

const createStudentPdfFile = (student) => {
  const profile = student.academyProfile || student;
  const rows = [
    section("DADOS DO ALUNO"),
    field("Nome completo", student.name || profile.name),
    field("Apelido", profile.nickname),
    field("E-mail", profile.email),
    field("Data de nascimento", profile.birthDate),
    field("Idade", profile.age),
    field("Categoria", profile.category),
    field("Posição principal", profile.primaryPosition),
    field("Posição secundária", profile.secondaryPosition),
    field("Pé dominante", profile.dominantFoot),
    field("Altura", profile.height ? `${String(profile.height).replace(".", ",")} m` : ""),
    field("Peso", profile.weight ? `${profile.weight} kg` : ""),
    section("SAÚDE E SEGURANÇA"),
    field("Restrições médicas", profile.medicalRestrictions),
    field("Alergias", profile.allergies),
    field("Tipo sanguíneo", profile.bloodType),
    field("Medicamentos contínuos", profile.continuousMedication),
    field("Contato de emergência", profile.emergencyName),
    field("Telefone de emergência", profile.emergencyPhone),
  ];
  const safeName = latin1(student.name || profile.name || "aluno")
    .replace(/[^a-zA-Z0-9À-ÿ]+/g, "-")
    .toLowerCase();
  return {
    bytes: createPdf("FICHA COMPLETA DO ALUNO", rows),
    filename: `ficha-${safeName}.pdf`,
  };
};

export const downloadStudentForm = (student) => {
  const { bytes, filename } = createStudentPdfFile(student);
  download(bytes, filename);
};

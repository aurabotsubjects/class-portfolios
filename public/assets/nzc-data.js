// NZ Curriculum (refreshed, Te Mātaiaho) — Phase 2, Year 5 and Year 6 "I can…" objectives.
// Condensed and reworded from the year-by-year teaching sequences on Tāhūrangi (newzealandcurriculum.tahurangi.education.govt.nz).
// English and Maths follow the final 2026 pages. Science and Social Sciences were written from the Ministry's Year 5/6 summary pages
// (based on the drafts) — check topics against the final 12 Aug 2026 versions. HPE, Arts and Technology are also draft-based.
// Edit freely on GitHub. IDs (e.g. MA.NUM.5.2) are what the tick-off page, the Excel files and Claude's reply use — don't renumber after ticking starts.
(function () {
  const A = [];
  function area(k, name, colour) { const a = { k, name, colour, strands: [] }; A.push(a); return a; }
  function strand(a, k, name, y5, y6, flag) { a.strands.push({ k, name, flag: flag || {}, obj: { 5: y5, 6: y6 } }); }

  let a = area('MA', 'Maths & Statistics', '4F7BE0');
  strand(a, 'NUM', 'Number',
    ['I can read, write, order and compare whole numbers and decimals using place value', 'I can add and subtract multi-digit whole numbers and decimals with efficient strategies', 'I can multiply and divide multi-digit numbers using mental and written strategies and recall multiplication facts', 'I can find equivalent fractions and compare, order, add and subtract fractions', 'I can connect fractions, decimals and percentages (e.g. ½ = 0.5 = 50%)', 'I can solve everyday money problems and plan a simple budget'],
    ['I can work with very large numbers and decimals and explain the place value', 'I can solve multi-step problems using all four operations and check my answer is sensible', 'I can add, subtract and multiply fractions and decimals', 'I can find percentages of amounts and move between fractions, decimals and percentages', 'I can use ratio and rates to compare and scale quantities', 'I can solve financial problems such as discounts, interest, credit and budgeting']);
  strand(a, 'ALG', 'Algebra',
    ['I can describe, continue and create number and shape patterns using a rule', 'I can find an unknown number in a simple equation', 'I can write and follow step-by-step instructions (an algorithm) for a task'],
    ['I can use words and symbols to write a rule for a pattern and use it to predict', 'I can solve and write equations with one unknown, including with fractions and decimals', 'I can describe a relationship using a table or graph', 'I can design an algorithm that uses repeated steps or decisions']);
  strand(a, 'MEAS', 'Measurement',
    ['I can measure length, mass, volume, capacity and time using suitable units', 'I can convert between common metric units', 'I can find perimeter and area of rectangles and shapes made of rectangles', 'I can read and use timetables and calendars'],
    ['I can choose and use suitable units and instruments and convert between metric units', 'I can find area of rectangles, triangles and composite shapes and explain the method', 'I can find the volume of cubes and cuboids', 'I can solve time problems including elapsed time and time zones']);
  strand(a, 'GEO', 'Geometry',
    ['I can describe and sort 2D shapes and 3D objects by their properties', 'I can find lines of symmetry and show reflections, rotations and translations', 'I can describe position and movement using a map or grid'],
    ['I can use properties of shapes and angles to solve problems', 'I can build 3D objects from nets and sketch them from different views', 'I can transform shapes and describe the transformation', 'I can use coordinates and scale on maps and grids']);
  strand(a, 'STAT', 'Statistics',
    ['I can pose a question, collect and organise data', 'I can display data in graphs and tables (e.g. bar graphs, dot plots)', 'I can read and interpret graphs and say what the data shows'],
    ['I can plan a statistical investigation and collect suitable data', 'I can choose a display that suits the data and justify my choice', 'I can summarise and compare data sets and draw conclusions that I back with evidence']);
  strand(a, 'PROB', 'Probability',
    ['I can describe how likely events are using everyday and mathematical words', 'I can list all the possible outcomes of a simple chance event'],
    ['I can describe the probability of an event using fractions, decimals or percentages', 'I can compare experimental results with what I expect and explain differences']);
  strand(a, 'DO', 'Working mathematically',
    ['I can investigate a problem and try different approaches', 'I can represent my thinking with diagrams, models and symbols', 'I can explain and justify my answer to others'],
    ['I can investigate, connect ideas and generalise what I notice', 'I can represent problems in several ways and choose the best', 'I can justify and critique reasoning using mathematical language']);

  a = area('EN', 'English', 'E0607E');
  strand(a, 'ORAL', 'Oral language',
    ['I can share ideas clearly and with expression for a particular audience', 'I can listen carefully and respond with relevant ideas and questions', 'I can use new vocabulary and correct grammar when I speak', 'I can talk with others to build understanding in my learning'],
    ['I can plan and present ideas with a clear structure and confident delivery', 'I can listen critically, ask thoughtful questions and build on others\' ideas', 'I can adapt my language and tone to purpose and audience', 'I can contribute to group discussions and work towards agreement']);
  strand(a, 'READ', 'Reading',
    ['I can read Year 5 texts accurately and fluently, working out unfamiliar words', 'I can make and justify inferences using evidence from the text', 'I can find main ideas and summarise a text', 'I can explain the author\'s purpose and the effect of language features'],
    ['I can read complex texts fluently and with expression', 'I can synthesise ideas across several texts', 'I can evaluate how language, structure and perspective shape meaning', 'I can question an author\'s purpose, viewpoint and possible bias']);
  strand(a, 'WRITE', 'Writing',
    ['I can write for different purposes with ideas organised into paragraphs', 'I can use a range of punctuation and sentence types correctly', 'I can spell Year 5 words and use spelling patterns and strategies', 'I can plan, draft, revise and edit my writing'],
    ['I can write for a chosen purpose and audience with a clear structure and voice', 'I can craft sentences and choose precise words for effect', 'I can spell Year 6 words and apply word-building knowledge', 'I can plan, revise and edit my work using feedback and publish a polished piece']);

  a = area('SC', 'Science', '3F9F4A');
  strand(a, 'MAT', 'Material world / Physical world',
    ['I can describe and compare properties of materials', 'I can measure mass and volume and explain density (e.g. why things float)', 'I can describe pushes, pulls and forces such as friction and gravity', 'I can explain how simple machines make work easier'],
    ['I can investigate how light behaves (reflection, shadows, colour)', 'I can build and draw a simple electrical circuit and explain how it works', 'I can describe energy changes in everyday examples']);
  strand(a, 'EARTH', 'Planet Earth and beyond',
    ['I can describe the movements of the Earth, Moon and Sun and how they cause day, night and seasons', 'I can describe the maramataka and how people have observed the Moon'],
    ['I can describe soil and rocks and how they are formed or changed', 'I can describe fossils and what they can tell us', 'I can describe the night sky, including Matariki and the stars'],
    { 'EARTH.6.2': 'worldview' });
  strand(a, 'LIVE', 'Living world',
    ['I can describe how plants and animals reproduce', 'I can describe an ecosystem and the food chains within it', 'I can explain how living things depend on each other'],
    ['I can describe variation within a species and how living things are suited to their environment', 'I can describe adaptation and natural selection', 'I can describe how body systems work together'],
    { 'LIVE.6.2': 'worldview' });
  strand(a, 'NOS', 'Nature of science',
    ['I can ask a question and plan a fair test', 'I can observe, measure and record results accurately', 'I can explain my results using evidence'],
    ['I can plan and run an investigation controlling variables', 'I can analyse results, draw conclusions and suggest improvements', 'I can communicate findings and explain how scientists use evidence']);

  a = area('SS', 'Social Sciences', 'C79A00');
  strand(a, 'HIST', 'History',
    ['I can describe how Māori lived in Aotearoa before European arrival', 'I can describe key features of an ancient civilisation (e.g. Ancient China) and compare it with others', 'I can explain how and why natural events have shaped people\'s lives in the past'],
    ['I can describe key events in Aotearoa New Zealand\'s history up to 1840', 'I can compare life in different periods (e.g. Elizabethan and Victorian ages)', 'I can use sources to ask questions about the past and judge how reliable they are']);
  strand(a, 'CIV', 'Civics and society',
    ['I can explain why we have rules and laws and how they are made', 'I can describe how decisions are made in groups and communities'],
    ['I can describe rights and responsibilities of people in our society', 'I can describe ways people take part and make a difference in their communities']);
  strand(a, 'GEOG', 'Geography',
    ['I can explain natural hazards such as earthquakes and volcanoes and why they happen', 'I can describe different biomes and how people live in them', 'I can read maps and use geographic words'],
    ['I can describe why and how cities grow (urbanisation)', 'I can describe the causes and effects of climate change', 'I can describe the people and places of South-East Asia']);
  strand(a, 'ECON', 'Economic activity',
    ['I can explain how money and banks work', 'I can describe needs and wants and how choices are made'],
    ['I can explain how a business works and how it makes a profit', 'I can explain credit and budgeting']);

  a = area('HP', 'Health & Physical Education', 'D0763C');
  strand(a, 'HEALTH', 'Health education',
    ['I can describe how to look after my body and mind', 'I can describe qualities of healthy relationships and how to include others', 'I can use strategies to stay safe and make healthy choices'],
    ['I can describe changes in my body and mind and where to find support', 'I can describe how to build and keep respectful relationships', 'I can plan and use strategies to stay safe, well and resilient']);
  strand(a, 'PE', 'Physical education',
    ['I can use a range of movement skills in games, sport and fitness', 'I can take part in outdoor education and work as a team', 'I can show fair play and good sportsmanship'],
    ['I can combine and refine movement skills in games, sport and fitness', 'I can plan and take part in outdoor activities safely', 'I can lead others and demonstrate fair play']);

  a = area('AR', 'The Arts', '8A6FD1');
  strand(a, 'ART', 'Visual arts, music, drama and dance',
    ['I can use visual art elements and techniques to make artworks', 'I can perform and create music using rhythm, melody and voice', 'I can create and perform short drama or dance pieces', 'I can talk about artworks and performances and what they mean'],
    ['I can develop ideas into more refined artworks using elements and techniques', 'I can create, rehearse and perform music for an audience', 'I can create and perform drama or dance with a clear idea', 'I can respond to and describe artworks and performances using arts words']);

  a = area('TE', 'Technology', '2A9D8F');
  strand(a, 'TECH', 'Technology',
    ['I can design and make a simple product to meet a need', 'I can choose and safely use materials and tools', 'I can use digital tools and behave safely and respectfully online'],
    ['I can design, make and improve a product, explaining my choices', 'I can describe how parts of a system work together', 'I can use digital tools well and be a responsible digital citizen']);

  // build flat list with stable ids
  const list = [];
  A.forEach((ar) => ar.strands.forEach((s) => [5, 6].forEach((y) => s.obj[y].forEach((text, i) => {
    const id = ar.k + '.' + s.k + '.' + y + '.' + (i + 1);
    list.push({ id, area: ar.k, areaName: ar.name, strand: s.k, strandName: s.name, year: y, text, flag: s.flag[s.k + '.' + y + '.' + (i + 1)] || '' });
  }))));
  window.NZC = { areas: A, list, byId: Object.fromEntries(list.map((o) => [o.id, o])), key: (id) => 'nzc|' + id,
    forYear: (y) => list.filter((o) => o.year === y) };
})();

document.addEventListener("mouseup", function (event) {
  console.log("mouseup", event);
  debugger;
  if (event.ctrlKey) {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      const userConfirmed = confirm(
        `Selected: "${selection}". Add to anki?`
      );
      if (userConfirmed) {
        console.log(`Действие подтверждено для: "${selection}"`);
        getWordData(selection, undefined);
      } else {
        console.log(`Действие отменено для: "${selection}"`);
      }
    }
  }
});

function getWordData(word) {
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
    .then((response) => response.json())
    .then((data) => {
      // Example processing of returned data
      debugger;
      if (data && Array.isArray(data) && data.length > 0) {
        data.forEach(async (item) => {
          const wordData = item;
          const word = wordData.word;
          const meanings = wordData.meanings
            .map((meaning) =>
              meaning.definitions.map((def) => {
                return {
                  word: word,
                  definition: def.definition,
                  example: def.example,
                };
              })
            )
            .flat();
          const audioUrl = wordData.phonetics.find((obj) => obj.audio) || "";

          // Integrate Anki API call here
          // Example (assume sendToAnki is a function to handle Anki integration):
          const notes = meanings.map((item) => {
            if (item.example) {
              const frontContent = item.example.replace(
                new RegExp(item.word, "g"),
                `{{c1::${item.word}}}`
              );
              return {
                note: {
                  deckName: "english", // set your own already created deck's name
                  modelName: "Задание с пропусками", // check anki app -> tools -> card types, then set proper
                  fields: {
                    Front: `${frontContent}`,
                    Back: `<audio src="${audioUrl}"></audio><br>${item.definition}`,
                  },
                  tags: [],
                },
              };
            } else {
              return {
                note: {
                  deckName: "english", // set your own already created deck's name
                  modelName: "Простая", // check anki app -> tools -> card types, then set proper
                  fields: {
                    Front: `${item.definition}`,
                    Back: `<audio src="${audioUrl}"></audio><br>${item.word}`,
                  },
                  options: {
                    allowDuplicate: false,
                  },
                  tags: [],
                },
              };
            }
          });
          await notes.forEach(async (item) => {
            await sendToAnki(item);
          });
        });
      }
    })
    .catch((err) => {
      console.error(err);
      alert(err);
    });
}

async function sendToAnki(note) {
  await fetch("http://localhost:8765", { // check anki-connect plugin installed to anki configuration there: anki app -> tools -> addons -> ankiconnect configuration address and port
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "addNote",
      version: 6,
      params: note,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Anki response:", data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

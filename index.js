const express = require('express');
const storage = require('node-persist');
const server = express();
const { v4: uuid } = require('uuid');

server.use(express.urlencoded({ extended: true }));
server.use(express.json());

//~~~~~~~~~
// ROUTES
//~~~~~~~~~
server.post('/survey/new', async (req, res) => {
  const { questions } = req.body;
  if (!questions) {
    res.status(400).json({ error: "Please provide list of questions for new survey" });
  }

  try {
    const newSurvey = await createSurvey(JSON.parse(questions));
    await storeSurveyToFile(newSurvey);

    res.json({ 
      msg: `New survey created: ${newSurvey.id}` 
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

async function initStorage() {
  await storage.init();

  const surveys = await storage.getItem('surveys');
  if (!surveys) {
    await storage.setItem('surveys', {});
  }
}

async function createSurvey(questions) {
  if (!questions || questions.length === 0) {
    throw new Error('Empty question list not allowed');
  }

  let newSurvey = {};

  const id = uuid();
  newSurvey.id = id;

  // create survey object with questions
  let responses = [];
  questions.forEach((question, i) => {
    if (question.length === 0) {
      throw new Error('Blank questions not allowed.');
    }

    responses[i] = { true: 0, false: 0 };
  });

  newSurvey.questions = questions;
  newSurvey.responses = responses;

  return newSurvey;
}

async function takeSurvey(surveyId, responses) {
}

async function getSurveyResponses(surveyId) {
}

async function storeSurveyToFile(survey) {
  // store new survey to file
  let surveys = await storage.getItem('surveys');

  surveys = {
    ...surveys,
    [survey.id]: survey
  }

  await storage.updateItem('surveys', surveys)
}

const PORT = 3000;
server.listen(PORT, async () => {
  console.log(`server running on port ${PORT}`);

  await initStorage()
  
  const surveys = await storage.getItem('surveys');
  // console.log(surveys);
});

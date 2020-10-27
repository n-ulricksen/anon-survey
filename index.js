const express = require('express');
const storage = require('node-persist');
const server = express();
const { v4: uuid } = require('uuid');

server.use(express.urlencoded({ extended: true }));
server.use(express.json());

//~~~~~~~~~
// ROUTES
//~~~~~~~~~
server.post('/survey/new', newSurveyHandler);

server.post('/survey/:id/take', takeSurveyHandler);

server.get('/survey/:id/results', getSurveyResultsHandler);

//~~~~~~~~~~
// HANDLERS
//~~~~~~~~~~
async function newSurveyHandler(req, res) {
  const { questions } = req.body;
  if (!questions) {
    res.status(400).json({ error: "Please provide list of questions for new survey" });
  }

  try {
    const newSurvey = await createSurvey(JSON.parse(questions));
    await storeSurveyToFile(newSurvey);

    res.json({ 
      'success': `New survey created: ${newSurvey.id}` 
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
}

async function takeSurveyHandler(req, res) {
  const { id } = req.params;
  const { responses } = req.body;
  if (!responses) {
    res.status(400).json({ error: "Please provide list of responses to complete the survey" });
  }

  try {
    await takeSurvey(id, JSON.parse(responses));

    res.json({ 
      'success': "Responses successfully recoreded." 
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
}

async function getSurveyResultsHandler(req, res) {
  const { id } = req.params;

  try {
    const results = await getSurveyResults(id);

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
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
  const survey = await getSurveyById(surveyId);
  if (survey.questions.length !== responses.length) {
    throw new Error(`Incorrect number of responses: ${responses.length}. Expected ${survey.questions.length}`);
  }

  // parse/process answers
  responses.forEach((response, i) => {
    if (typeof response !== "boolean") {
      throw new Error(`Invalid response type: ${typeof response}`);
    }
    
    survey.responses[i][response]++;
  });

  // update survey's response data
  await storeSurveyToFile(survey);
}

async function getSurveyResults(surveyId) {
  const survey = await getSurveyById(surveyId);

  return survey.questions.map((question, i) => ({
    question,
    responses: survey.responses[i]
  }));
}

async function storeSurveyToFile(survey) {
  let surveys = await storage.getItem('surveys');

  surveys = {
    ...surveys,
    [survey.id]: survey
  }

  await storage.updateItem('surveys', surveys)
}

async function getSurveyById(id) {
  const surveys = await storage.getItem('surveys');
  const survey = surveys[id];
  if (!survey) {
    throw new Error(`Survey with id ${id} not found.`);
  }

  return survey
}

async function initStorage() {
  await storage.init();

  const surveys = await storage.getItem('surveys');
  if (!surveys) {
    await storage.setItem('surveys', {});
  }
}

const PORT = 3000; 
server.listen(PORT, async () => {
  console.log(`server running on port ${PORT}`);

  await initStorage()
});

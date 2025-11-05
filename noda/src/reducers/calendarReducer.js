// src/reducers/calendarReducer.js

const initialState = {
  events: [],
  selectedEvent: null,
  selectedCalendars: [],
  filters: [],
  loading: false,
  error: null,
};

export default function calendar(state = initialState, action) {
  switch (action.type) {
    case "FETCH_EVENTS":
      return { ...state, events: action.events, loading: false };

    case "ADD_EVENT":
    case "UPDATE_EVENT":
    case "REMOVE_EVENT":
      return { ...state, loading: true };

    case "SELECT_EVENT":
      return { ...state, selectedEvent: action.event };

    case "UPDATE_FILTERS":
      return { ...state, filters: action.filter };

    case "UPDATE_ALL_FILTERS":
      return { ...state, filters: action.value };

    default:
      return state;
  }
}

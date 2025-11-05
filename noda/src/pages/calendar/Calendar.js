import { Fragment, useState, useEffect } from 'react'

import classnames from 'classnames'
import { Row, Col } from 'reactstrap'

import CalendarBody from "./components/CalendarBody"
import SidebarRight from "./components/SidebarRight";
import AddEventSidebar from "./components/AddEventSidebar";

import { useSelector, useDispatch } from "react-redux"
import {
  fetchEvents, //일정
  selectEvent, //일정선택
  updateEvent, //일정 수정
  updateFilter, //필터 
  updateAllFilters, //전체 필터 선택/해제
  addEvent, //일정추가
  removeEvent //일정삭제
} from "../../actions/calendar";

const calendarsColor = {
  Business: 'primary',
  Personal: 'danger',
  Flatlogic: 'warning',
  Holiday: 'success',
}

const Calendar = () => {
  const dispatch = useDispatch()
  const store = useSelector(state => state.calendar) //캘린더 가져오기

  const [addSidebarOpen, setAddSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [calendarApi, setCalendarApi] = useState(null)

  const handleAddEventSidebar = () => setAddSidebarOpen(!addSidebarOpen)
  const toggleSidebar = val => setRightSidebarOpen(val)

  const blankEvent = {
    title: '',
    start: '',
    end: '',
    allDay: false,
    url: '',
    extendedProps: {
      calendar: '',
      guests: [],
      location: '',
      description: '',
    }
  }

  const refetchEvents = () => {
    if (calendarApi !== null) {
      calendarApi.refetchEvents()
    }
  }

  useEffect(() => {
    dispatch(fetchEvents(store.selectedCalendars))
  }, [store.selectedCalendars])// store.selectedCalendars배열추가

  return (
    <Fragment>
      <div className="app-calendar overflow-hidden">
        <Row noGutters>

          <Col className="position-relative mr-3">
            <CalendarBody
              store={store}
              dispatch={dispatch}
              blankEvent={blankEvent}
              calendarApi={calendarApi}
              setCalendarApi={setCalendarApi}
              calendarsColor={calendarsColor}
              toggleSidebar={toggleSidebar}
              selectEvent={selectEvent}
              updateEvent={updateEvent}
              handleAddEventSidebar={handleAddEventSidebar}
            />
          </Col>
          <Col
            id='app-calendar-sidebar'
            className={classnames('col app-calendar-sidebar flex-grow-0 overflow-hidden d-flex flex-column', {
              show: rightSidebarOpen
            })}
          >
            <SidebarRight
              store={store}
              dispatch={dispatch}
              updateFilter={updateFilter}
              updateAllFilters={updateAllFilters}
              toggleSidebar={toggleSidebar}
              handleAddEventSidebar={handleAddEventSidebar}
            />
          </Col>
          <div
            className={classnames("body-content-overlay", {
              show: rightSidebarOpen === true
            })}
            onClick={() => toggleSidebar(false)}
          />
        </Row>
      </div>
      <AddEventSidebar
        store={store}
        dispatch={dispatch}
        open={addSidebarOpen}
        handleAddEventSidebar={handleAddEventSidebar}
        selectEvent={selectEvent}
        addEvent={addEvent}
        removeEvent={removeEvent}
        refetchEvents={refetchEvents}
        updateEvent={updateEvent}
        calendarApi={calendarApi}
        calendarsColor={calendarsColor}
      />
    </Fragment>
  )
}

export default Calendar;

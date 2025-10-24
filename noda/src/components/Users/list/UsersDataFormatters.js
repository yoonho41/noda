// import React from "react";
import moment from "moment";
import { truncate } from "lodash";

import s from "../Users.module.scss";
import avatar1 from "../../../assets/tables/ellieSmithImg.png";
import avatar2 from "../../../assets/tables/floydMilesImg.png";
import avatar3 from "../../../assets/tables/rosaFloresImg.png";
import avatar4 from "../../../assets/tables/janeCooper.png";
import adminImg from "../../../assets/user.svg";

const avatars = [avatar1, avatar2, avatar3, avatar4];

function imageFormatter(cell, rows, _, index) {
  const imageUrl = cell && cell.length
    ? cell[0].publicUrl
    : undefined;
  return (
    <span className={`${s.avatar} rounded-circle`}>
      {imageUrl || rows.role === "admin"
        ? <img src={imageUrl || adminImg} onError={e => e.target.src = avatars[index + 1]} alt="avatar" />
        : <span className={`${s.avatar} rounded-circle thumb-sm float-left`}>{rows.email.charAt(0).toUpperCase()}</span>
      }
    </span>
  );
};

function booleanFormatter(cell) {
  return cell
    ? "Yes"
    : "No";
};

function dateTimeFormatter(cell) {
  return cell
    ? moment(cell).format("YYYY-MM-DD HH:mm")
    : null;
}

function filesFormatter(cell) {
  return (
    <div>
      { cell && cell.map((value) => {
        return (
          <div key={value.id}>
            <i className="la la-link text-muted mr-2"/>
            <a
              href={value.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              {truncate(value.name)}
            </a>
          </div>
        );
      })}
    </div>
  )
};

function listFormatter(cell) {
  if (!cell) return null;

  return (
    <div>
      { cell && cell.length && cell.map((value) => {
        return (
          <div key={value.id}>
            <a href={value.id}>
              {value.name}
            </a>
          </div>
        )
      })}
      { cell &&
        <div key={cell.id}>
          <a href={cell.id}>{cell.name}</a>
        </div>
      }
    </div>
  );
};

export { booleanFormatter, imageFormatter, dateTimeFormatter, listFormatter, filesFormatter }

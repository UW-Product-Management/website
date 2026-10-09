import React from 'react';
import PageHero from '../components/PageHero';
import '../styles/Home.css';
import '../styles/About.css';
import '../App.css';
import { Container } from 'react-bootstrap';
import AboutIntro from '../components/AboutIntro';
import Footer from '../components/Footer';
import { CLUB_VALUES } from '../data/clubValues';

const SMALL_ICON_VALUE_IDS = new Set(['learning', 'engagement']);

// TODO: Reorganize the following code into src/components. See src/pages/Home.js as a reference

export default function About({ show }) {
  return (
    <>
      <PageHero active="about" title="About Us" ariaLabel="About UW PM hero">
        <div
          className="about-hero-placeholder"
          role="img"
          aria-label="About us banner placeholder"
        />
      </PageHero>

      <AboutIntro />

      <Container>
        <div>
          <div className="values-title-wrapper" id="values">
            <a className="title-div" href="#values">
              <div>
                <h2>Values</h2>
              </div>
            </a>
            <div className="values-grid">
              {CLUB_VALUES.map((value) => (
                <div
                  key={value.id}
                  className={`value-item value-item--${value.id}`}
                >
                  <div className="value-item__media">
                    <img
                      src={value.image}
                      className={
                        SMALL_ICON_VALUE_IDS.has(value.id)
                          ? 'icons-image icons-image--small'
                          : 'icons-image'
                      }
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                  <div className="value-item__copy">
                    <h3>{value.title}</h3>
                    <p>{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
      <Footer />
    </>
  );
}

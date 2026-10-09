import React, { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import { Mousewheel } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

import { ExecList } from '../components/ExecList';
import Footer from '../components/Footer';
import PageHero from '../components/PageHero';
import { CLUB_MISSION, CLUB_VALUES } from '../data/clubValues';
import teamPhoto from '../images/prodcon/prodcon1.JPG';
import '../styles/Home.css';
import '../styles/EventsV4.css';
import '../styles/Team.css';

const teamCategories = [
  {
    category: 'Internal',
    members: [ExecList.Aishwarya, ExecList.Muktha, ExecList.Samuel],
  },
  {
    category: 'Marketing',
    members: [ExecList.Khushi, ExecList.EvelynT, ExecList.Orlando],
  },
  {
    category: 'Podcast',
    members: [ExecList.August, ExecList.Samir, ExecList.Milind, ExecList.Ria],
  },
  {
    category: 'Outreach',
    members: [ExecList.Fanelle, ExecList.EvelynW, ExecList.Maurya],
  },
  {
    category: 'Design',
    members: [ExecList.Ellie, ExecList.Evan, ExecList.Nemesha],
  },
  {
    category: 'Events',
    members: [
      ExecList.Nicole,
      ExecList.Masudah,
      ExecList.Michael,
      ExecList.Owen,
    ],
  },
  {
    category: 'Engineering',
    members: [
      ExecList.Shreya,
      ExecList.Krish,
      ExecList.Cedric,
      ExecList.Gaurika,
      ExecList.Lalithya,
      ExecList.Naysha,
    ],
  },
  {
    category: 'Content',
    members: [ExecList.Jiya, ExecList.Arpit, ExecList.Puneet],
  },
  {
    category: 'Finance',
    members: [ExecList.KrishFinance],
  },
];

export default function Team() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = 400;
      const progress = Math.min(window.scrollY / maxScroll, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bannerWidthVW = 100 - scrollProgress * 24;
  const bannerStyle = {
    width: `${bannerWidthVW}vw`,
    marginLeft: `calc(50% - ${bannerWidthVW / 2}vw)`,
  };

  return (
    <>
      <PageHero active="team" title="Team" ariaLabel="UW PM team hero" />

      <Container>
        <div className="team-page">
          <div className="team-banner" style={bannerStyle}>
            <img src={teamPhoto} alt="UW PM team" className="team-banner-img" />
          </div>

          <div className="values-carousel-wrapper">
            <h2 className="values-carousel-title">Our values.</h2>
            <Swiper
              modules={[Mousewheel]}
              spaceBetween={20}
              slidesPerView={3.5}
              mousewheel={{ forceToAxis: true }}
              className="values-swiper"
            >
              <SwiperSlide className="value-card">
                <h3>Mission</h3>
                <p>{CLUB_MISSION.mission}</p>
              </SwiperSlide>
              <SwiperSlide className="value-card">
                <h3>Vision</h3>
                <p>{CLUB_MISSION.vision}</p>
              </SwiperSlide>
              {CLUB_VALUES.map((value) => (
                <SwiperSlide key={value.id} className="value-card">
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <div className="our-team-wrapper">
            <h2 className="our-team-title">Our team.</h2>
            {teamCategories.map((group) => (
              <div key={group.category} className="team-group">
                <h3 className="team-group-title">{group.category}</h3>
                <div className="team-grid">
                  {group.members.map((member, idx) => (
                    <div
                      key={`${member.name}-${idx}`}
                      className="team-member-card"
                    >
                      <div className="team-member-avatar-wrap">
                        {member.link ? (
                          <a
                            href={member.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="team-member-link"
                          >
                            <img
                              src={member.image}
                              alt={member.name}
                              className="team-member-avatar"
                            />
                          </a>
                        ) : (
                          <img
                            src={member.image}
                            alt={member.name}
                            className="team-member-avatar"
                          />
                        )}
                      </div>
                      {member.link ? (
                        <a
                          href={member.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="team-member-name-link"
                        >
                          <h4 className="team-member-name">{member.name}</h4>
                        </a>
                      ) : (
                        <h4 className="team-member-name">{member.name}</h4>
                      )}
                      <p className="team-member-role">{member.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
      <Footer />
    </>
  );
}

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ElectionDetailes.css';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import vote from '../Assests/online-voting.png';
import { useTheme } from '../../Context/ThemeContext';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const ElectionDetails = () => {
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votedCandidateId, setVotedCandidateId] = useState(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/v1/elections/election/${id}`);
        setElection(data.data);

        const userId = localStorage.getItem('user-id');
        const votedCandidate = data.data.results?.voteDistribution?.find(candidate =>
          candidate.voters.includes(userId)
        );
        if (votedCandidate) {
          setVotedCandidateId(votedCandidate._id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchElectionData();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (election) {
        const now = new Date();
        const start = new Date(election.startTime);
        const end = new Date(election.endTime);

        if (now < start) {
          const timeLeft = start - now;
          const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
          const m = Math.floor((timeLeft / (1000 * 60)) % 60);
          const s = Math.floor((timeLeft / 1000) % 60);
          setCountdown(`${d}d ${h}h ${m}m ${s}s`);
        } else if (now >= start && now <= end) {
          setCountdown('Election has started!');
        } else {
          setCountdown('Election has ended!');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [election]);

  const handleRowClick = (userId) => {
    navigate(`/candidate/${userId}`);
  };

  const handleVote = async (candidate, candidateId) => {
    const now = new Date();
    const start = new Date(election.startTime);
    const end = new Date(election.endTime);
    const token = localStorage.getItem('auth-token');
    const userId = localStorage.getItem('user-id');

    if (now < start) return Swal.fire('Voting not started yet!', '', 'info');
    if (now > end) return Swal.fire('Voting has ended!', '', 'warning');
    if (!token) return Swal.fire('Login Required', 'Please log in to vote.', 'error');
    if (votedCandidateId) return Swal.fire('Already Voted', '', 'error');
    if (!candidate.isVerified) return Swal.fire('Candidate not verified!', '', 'error');

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to change your vote!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, vote!',
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.post(
        `${BASE_URL}/api/v1/elections/${candidateId}/vote`,
        { voterId: userId, electionId: election._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setVotedCandidateId(candidateId);
      Swal.fire('Success', 'Your vote has been recorded.', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Voting failed.', 'error');
    }
  };

  if (loading) return <p>Loading election data...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!election) return <p>No election found.</p>;

  return (
    <div className={`election-details-container ${theme}`}>
      <h2 className={`election-title ${theme}`}>{election.name}</h2>
      <h4 className="election-date">{new Date(election.date).toLocaleDateString()}</h4>
      <p className={`election-description ${theme}`}><b>Starts at: </b>{new Date(election.startTime).toLocaleString()}</p>
      <p className={`election-description ${theme}`}><b>Ends at: </b>{new Date(election.endTime).toLocaleString()}</p>
      <p className={`election-description ${theme}`}><b>Description: </b><br />{election.description}</p>
      <p className={`election-description ${theme}`}><b>Rules: </b><br />{election.rules}</p>
      <p><strong>Countdown:</strong> {countdown}</p>

      <h3 className={`candidates-title ${theme}`}>Candidates</h3>
      <table className={`candidates-table ${theme}`}>
        <thead>
          <tr>
            <th>#</th>
            <th>Photo</th>
            <th>Name</th>
            <th>Vote</th>
          </tr>
        </thead>
        <tbody>
          {election.candidates.map((candidate, index) => (
            <tr key={candidate._id}>
              <td onClick={() => handleRowClick(candidate.user._id)}>{index + 1}</td>
              <td onClick={() => handleRowClick(candidate.user._id)}>
                <img className='profile' src={candidate.user.profilePhoto} alt="Profile" />
              </td>
              <td onClick={() => handleRowClick(candidate.user._id)}>
                {candidate.user.firstName} {candidate.user.lastName}
              </td>
              <td>
                <div className="voteee" onClick={(e) => { e.stopPropagation(); handleVote(candidate, candidate._id); }}>
                  <img src={vote} alt="Vote" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ElectionDetails;

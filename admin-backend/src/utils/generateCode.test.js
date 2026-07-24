const {generateMovieId} = require("./generateCode")
// Example usage
const movieName1 = "Doreamon in Nobita's Little Space War 1985";
const category1 = "Movie";
const movieId1 = generateMovieId(movieName1, category1); 
console.log(`${movieName1}: ${movieId1}`); 

const movieName2 = "Doraemon The Movie_Jadoo Mantar Aur Jahnoom";
const category2 = "Movie";
const movieId2 = generateMovieId(movieName2, category2); 
console.log(`${movieName2}: ${movieId2}`); 

const movieName3 = "Crayon Shin-chan Action Mask vs. Leotard Devil [1993]";
const category3 = "Series";
const movieId3 = generateMovieId(movieName3, category3); 
console.log(`${movieName3}: ${movieId3}`); 

const movieName4 = "Crayon Shin-chan Fierceness That Invites Storm! Me and the Space Princess [2012]";
const category4 = "Series";
const movieId4 = generateMovieId(movieName4, category4); 
console.log(`${movieName4}: ${movieId4}`); 
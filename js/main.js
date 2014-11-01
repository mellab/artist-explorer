var audio = null;
var currentPlayingSongId = null;
var playMusic = true;
var numberOfArtistsToShow = 10;

var api = new SpotifyWebApi();

window.addEventListener('load', function() {
    var formArtist = document.getElementById('search-artist');
    formArtist.addEventListener('submit', function(e) {
        e.preventDefault();
        var search = document.getElementById('artist-search');
        api.searchArtists(search.value.trim(), function(err, data) {
            if (data.artists && data.artists.items.length) {
                dndTree.setRoot(data.artists.items[0]);
            }
        });
    }, false);

    var formGenre = document.getElementById('search-genre');
    formGenre.addEventListener('submit', function(e) {
        e.preventDefault();
        var search = document.getElementById('genre-search');
        console.log("setting root genre")
        genreName = search.value.trim();
        dndTree.setRootGenre(genreName);
    }, false);

}, false);

api.searchArtists('Cake', function(err, data) {
    if (data.artists && data.artists.items.length) {
        dndTree.setRoot(data.artists.items[0]);
    }
});

var allGenres = [];

loadAllGenres();
console.log(allGenres);

function loadAllGenres() {
    $.ajax({
        url: "https://developer.echonest.com/api/v4/genre/list?api_key=74YUTJPKNBURV2BLX&format=json&results=1500"
    }).done(function(data) {
        data.response.genres.forEach(function(genre){
            allGenres.push(genre.name);
        });
    });
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function getInfo(artist) {

    playForArtist(artist);
    $('#infobox').css("visibility", "visible")
    $('#hoverwarning').css("display", "none")

    $('#artistName').text(artist.name);
    $('#artistName').attr("href", artist['external_urls']['spotify']);
    $('#artistName').attr("target", "_blank");

    drawChart(artist.popularity);
    $.ajax({
        url: "https://developer.echonest.com/api/v4/artist/profile?api_key=74YUTJPKNBURV2BLX%20&id="
        + artist.uri
        + "&bucket=genre&bucket=biographies&format=json",
    }).done(function(data) {
        var found = false;
        data.response.artist.biographies.forEach(function(biography){
            if (!biography.truncated && !found) {
                $('#biography').text(biography.text);
                found = true;
            }
        });

        $("#mainGenres").empty();
        data.response.artist.genres.forEach(function(genre) {
            $("#mainGenres").append("<li><a>" + toTitleCase(genre.name) + "</a></li>");
        });
        $('#mainGenres li').click( function() {
            dndTree.setRootGenre($(this).text());
        } );
    });

    $.ajax({
      url: "https://api.spotify.com/v1/artists/"
      + artist.id
      + "/top-tracks?country=SE",
    }).done(function(data) {
        $("#popularTracks").empty();
        data.tracks.forEach(function(track, i){
            var className = "now-playing";
            if (i === 0 && playMusic) {
                className += " active";
            }

            $("#popularTracks")
                .append('<li class="' + className +'" onmouseover="playFromList(this)" data-track-id='
                        + track.id + " data-preview-url=" + track.preview_url + ">"
                        + '<a target="_blank" href="'+ track['external_urls']['spotify'] + '">' + track.name + '</a>'
                        + "</li>");
        });
    });
}


function playMusicHandler() {
    if (document.getElementById('playMusic').checked) {
        playMusic = true;
    } else {
        playMusic = false;
        clearMusic();
    }
}

function getRelated(artistId, n) {
    return new Promise(function(resolve, reject) {
        return api.getArtistRelatedArtists(artistId, function(error, data) {

            //Sort in popularity order
            resolve(data.artists.sort(function(a, b) {
                return b.popularity - a.popularity;
            }).slice(0, n));
            // resolve(data.artists.slice(0, n));
      });
    });
}


function getIdFromArtistUri(artistUri) {
    return artistUri.split(':').pop();
}

function getArtistsForGenre(genreName, n) {
    return new Promise(function(resolve, reject) {
        return $.ajax({
            url: "https://developer.echonest.com/api/v4/genre/artists?api_key=74YUTJPKNBURV2BLX"
            +"&format=json&results=15&bucket=id:spotify"
            + "&name=" + genreName.toLowerCase()
        }).then(function(data) {
            console.log("in then");
            var idsToRequest = []
            data.response.artists.forEach(function(artist) {
                if (artist.foreign_ids) {
                    idsToRequest.push(getIdFromArtistUri(artist.foreign_ids[0].foreign_id));
                }
            });
            return api.getArtists(idsToRequest, function(error, data) {
                //Sort in popularity order
                resolve(data.artists.sort(function(a, b) {
                    return b.popularity - a.popularity;
                }).slice(0, n));
            });
        });
    });
}


function changeNumberOfArtists(value) {
    numberOfArtistsToShow = value;
    document.getElementById("range").innerHTML = value;
}

$(function() {
    $("#artist-search")
        // don't navigate away from the field on tab when selecting an item
        .bind("keydown", function(event) {
            if (event.keyCode === $.ui.keyCode.TAB &&
                $(this).autocomplete("instance").menu.active) {
                event.preventDefault();
            }
            if (event.keyCode == 13) {
                $(".ui-menu-item").hide();
            }
        })
        .autocomplete({
            minLength: 0,
            source: function(request, response) {
                api.searchArtists(request.term + '*', function(err, data) {
                    if (data.artists && data.artists.items.length) {
                        res = []
                        data.artists.items.forEach(function(artist) {
                            res.push(artist.name);
                        });
                        response(res);
                    }
                });
            },
            focus: function() {
                // prevent value inserted on focus
                return false;
            }
        });

    $("#genre-search")
        // don't navigate away from the field on tab when selecting an item
        .bind("keydown", function(event) {
            if (event.keyCode === $.ui.keyCode.TAB &&
                $(this).autocomplete("instance").menu.active) {
                event.preventDefault();
            }
            if (event.keyCode == 13) {
                $(".ui-menu-item").hide();
            }
        })
        .autocomplete({
            minLength: 0,
            source: allGenres,
            focus: function(e, ui) {
                // prevent value inserted on focus
                return false;
            }
        });
});

function setDefaultPopularTracks() {
    $("#popularTracks li").removeClass("active");
}

function playFromList(obj) {
    setDefaultPopularTracks();
    if (!playMusic) {
        return;
    }
    $(obj).addClass("now-playing active");

    var trackId = obj.getAttribute("data-track-id");
    var previewUrl = obj.getAttribute("data-preview-url");
    trac = {
        "id": trackId,
        "preview_url": previewUrl,
    }
    playForTrack(trac);
}

function playForTrack(track_to_play) {
    if (!playMusic) {
        return;
    }

    if (currentPlayingSongId == track_to_play.id) {
        return;
    }
    if (currentPlayingSongId != null) {
        audio.setAttribute('src', track_to_play.preview_url);
        audio.load();
        audio.play();
    } else {
        audio = new Audio(track_to_play.preview_url);
        audio.load();
        audio.play();
    }
    currentPlayingSongId = track_to_play.id;
}

function clearMusic() {
    setDefaultPopularTracks();
    if (audio) {
        audio.pause();
    }
    currentPlayingSongId = null;

}

function playForArtist(artist) {
    api.getArtistTopTracks(artist.id, "SE").then(function(data) {
        var track_to_play = data.tracks[0];
        playForTrack(track_to_play);
    });
}
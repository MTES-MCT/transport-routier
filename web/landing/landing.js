import React from "react";
import Container from "@material-ui/core/Container";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import { Header } from "../common/Header";
import { ManagerImage, SoftwareImage, WorkerImage } from "common/utils/icons";
import withWidth, { isWidthDown } from "@material-ui/core/withWidth";
import BackgroundHorizontalImage from "common/assets/images/landing-hero-horizontal.svg";
import BackgroundVerticalImage from "common/assets/images/landing-hero-vertical.svg";
import { MainCtaButton } from "../pwa/components/MainCtaButton";
import { Footer } from "./footer";

const useStyles = makeStyles(theme => ({
  whiteSection: {
    backgroundColor: theme.palette.background.paper
  },
  heroContainer: {
    backgroundColor: "#3184FF",
    padding: 0,
    margin: 0
  },
  heroInner: {
    padding: 0
  },
  section: {
    paddingTop: theme.spacing(7),
    paddingBottom: theme.spacing(7),
    paddingLeft: theme.spacing(5),
    paddingRight: theme.spacing(5),
    margin: 0
  },
  sectionTitle: {
    paddingBottom: theme.spacing(6)
  },
  videoHelperText: {
    paddingBottom: theme.spacing(4),
    maxWidth: 600,
    margin: "auto",
    textAlign: "justify"
  },
  videoContainer: {
    position: "relative",
    paddingBottom: "56.25%",
    height: 0,
    overflow: "hidden"
  },
  videoIframe: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden"
  },
  sectionHPadding: {
    paddingLeft: theme.spacing(5),
    paddingRight: theme.spacing(5)
  },
  inner: {
    margin: "auto",
    padding: 0
  },
  bgImage: {
    paddingTop: theme.spacing(14),
    paddingBottom: theme.spacing(14)
  },
  showcase: {
    padding: theme.spacing(2)
  },
  lightBlue: {
    backgroundColor: theme.palette.info.light
  },
  lightGreen: {
    backgroundColor: theme.palette.success.light
  },
  lightOrange: {
    backgroundColor: theme.palette.warning.light
  },
  subDescription: {
    fontStyle: "italic"
  },
  cta: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  faqCta: {
    flexShrink: 0,
    flexBasis: "auto"
  },
  questionTitle: {
    paddingBottom: theme.spacing(1)
  }
}));

function _Showcase({
  image,
  imageDescription,
  imageSubDescription,
  imagePosition,
  descriptionTitle,
  descriptionContent,
  ctaTarget,
  ctaLabel,
  width
}) {
  const classes = useStyles();

  const Image = props => (
    <Grid container direction="column" spacing={1} alignItems="center">
      <Grid item>{image}</Grid>
      <Grid item>
        <Typography className="bold" variant="h4" color="primary">
          {imageDescription}
        </Typography>
        <Typography className={classes.subDescription} variant="body2">
          {imageSubDescription}
        </Typography>
      </Grid>
    </Grid>
  );

  const Description = props => [
    <Typography align="left" variant="h4" key={0} className="bold">
      {descriptionTitle}
    </Typography>,
    <React.Fragment key={1}>{descriptionContent}</React.Fragment>,
    <MainCtaButton
      aria-label={ctaLabel}
      key={2}
      className={classes.cta}
      href={ctaTarget}
    >
      {ctaLabel}
    </MainCtaButton>
  ];

  const leftAlignImage = isWidthDown("sm", width) || imagePosition === "left";

  return (
    <Grid
      container
      alignItems="center"
      direction="row"
      spacing={4}
      justify="space-between"
    >
      <Grid
        item
        xs={leftAlignImage ? true : null}
        sm={leftAlignImage ? null : true}
      >
        {leftAlignImage ? <Image /> : <Description />}
      </Grid>
      <Grid
        item
        sm={leftAlignImage ? true : null}
        xs={leftAlignImage ? null : true}
      >
        {leftAlignImage ? <Description /> : <Image />}
      </Grid>
    </Grid>
  );
}

const Showcase = withWidth()(_Showcase);

export function Landing() {
  const [width, setWidth] = React.useState(window.innerWidth);

  React.useLayoutEffect(() => {
    function updateWidth() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const classes = useStyles({ width });
  return [
    <Header key={1} />,
    <Container key={2} maxWidth={false} className={classes.heroContainer}>
      <Container maxWidth="xl" className={`fade-in-image ${classes.heroInner}`}>
        <img
          src={
            width < 500 ? BackgroundVerticalImage : BackgroundHorizontalImage
          }
          width="100%"
          height="100%"
          style={{ float: "left" }}
        />
      </Container>
    </Container>,
    <Container
      key={4}
      className={`${classes.section}  ${classes.whiteSection}`}
      maxWidth={false}
    >
      <Container maxWidth="md" className={classes.inner}>
        <Typography variant="h3" className={`${classes.sectionTitle}`}>
          Mobilic ... 🤔 qu'est-ce que c'est ?
        </Typography>
        <Typography className={classes.videoHelperText}>
          Mobilic est la plateforme gouvernementale qui permet de{" "}
          <strong>simplifier le suivi du temps de travail</strong> dans le
          transport routier léger et le déménagement afin de lutter contre le
          travail illégal.
        </Typography>
        <Typography className={classes.videoHelperText}>
          Le livret individuel de contrôle (LIC), qui sert aujourd'hui à
          l'enregistrement du temps de travail des conducteurs de véhicules
          utilitaires légers de moins de 3,5 tonnes, et des autres personnels
          roulants non conducteurs, souffre de problèmes unanimement décriés
          (praticabilité pour le salarié, lourdeur administrative et de gestion,
          faible fiabilité pour le contrôle). Avec Mobilic{" "}
          <a
            href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043023481"
            target="_blank"
            rel="noopener noreferrer"
          >
            vous n'avez plus besoin du LIC papier
          </a>{" "}
          pour respecter vos engagements sociaux.
        </Typography>
        <Container maxWidth="sm" disableGutters>
          <Box className={classes.videoContainer}>
            <iframe
              title="Vidéo présentation Mobilic"
              className={classes.videoIframe}
              frameBorder="0"
              type="text/html"
              src="https://www.dailymotion.com/embed/video/x7w86gu"
              width="100%"
              height="100%"
              allowFullScreen
            ></iframe>
          </Box>
        </Container>
      </Container>
    </Container>,
    <Container key={5} className={`${classes.section}`} maxWidth={false}>
      <Container maxWidth="md" className={classes.inner}>
        <Typography variant="h3" className={`${classes.sectionTitle}`}>
          A qui s'adresse Mobilic ?
        </Typography>
        <Typography className={classes.videoHelperText}>
          Mobilic s'adresse aux conducteurs des entreprises de transport routier
          qui utilisent des véhicules utilitaires légers (VUL, {"<"} 3.5T), et
          aux autres{" "}
          <strong>
            personnels roulants qui sont soumis au livret individuel de contrôle
            (LIC)
          </strong>{" "}
          conformément aux articles R. 3312-19, 2° et R. 3312-58, 2° du code des
          transports : déménagement, ambulance, messagerie, fret express,
          transport de personnes.
        </Typography>
        <Box className={`${classes.lightBlue}`} p={2}>
          <Showcase
            image={<WorkerImage height={200} width={200} />}
            imagePosition="left"
            imageDescription="Travailleur mobile"
            imageSubDescription="Conducteurs et autres personnels roulants"
            descriptionTitle="Suivre simplement mon temps de travail et être mieux informé sur mes droits"
            descriptionContent={
              <div
                style={{
                  textAlign: "left",
                  fontSize: "1rem",
                  lineHeight: "1.6"
                }}
              >
                <p>Directement depuis mon téléphone</p>
                <ul
                  style={{
                    textAlign: "justify",
                    fontSize: "1rem",
                    lineHeight: "1.6"
                  }}
                >
                  <li>
                    Enregistrer de manière simple et rapide mon temps de travail
                    et mes frais
                  </li>
                  <li>
                    Accéder à tout moment à mon relevé d'heures et de frais
                  </li>
                </ul>
              </div>
            }
            ctaLabel="M'inscrire comme travailleur mobile"
            ctaTarget="/signup/user"
          />
        </Box>
        <Box p={2}>
          <Showcase
            image={<ManagerImage height={200} width={200} />}
            imagePosition="right"
            imageDescription="Gestionnaire"
            imageSubDescription="Responsables d'exploitation, dirigeants"
            descriptionTitle="Gérer facilement le temps de travail des salariés de mon entreprise"
            descriptionContent={
              <ul
                style={{
                  textAlign: "justify",
                  fontSize: "1rem",
                  lineHeight: "1.6"
                }}
              >
                <li>
                  Alléger la gestion administrative des données sociales de mon
                  entreprise en évitant la double saisie des informations
                </li>
                <li>
                  Optimiser l'organisation de mes équipes en accédant aux
                  données sociales en temps réel
                </li>
              </ul>
            }
            ctaLabel="M'inscrire comme gestionnaire"
            ctaTarget="/signup/admin"
          />
        </Box>
        <Box className={classes.lightBlue} p={2}>
          <Showcase
            image={<SoftwareImage height={200} width={200} />}
            imagePosition="left"
            imageDescription="Logiciel métier"
            descriptionTitle="Echanger en temps réel avec l'API Mobilic des données sociales clés pour la gestion du personnel"
            descriptionContent={
              <ul
                style={{
                  textAlign: "justify",
                  fontSize: "1rem",
                  lineHeight: "1.6"
                }}
              >
                <li>
                  Enrichir mon logiciel avec les données sociales, accessibles
                  sans délai
                </li>
                <li>
                  Garantir la conformité réglementaire de mes entreprises
                  clientes
                </li>
              </ul>
            }
            ctaLabel="Découvrir l'API"
            ctaTarget="/developers"
          />
        </Box>
      </Container>
    </Container>,
    <Container
      key={6}
      className={`${classes.section} ${classes.whiteSection}`}
      maxWidth={false}
    >
      <Container maxWidth="md" className={classes.inner}>
        <Typography variant="h3" className={`${classes.sectionTitle}`}>
          Ce qu'il faut savoir sur Mobilic
        </Typography>
        <Grid
          container
          spacing={4}
          alignItems="center"
          justify="space-between"
          className={classes.showcase}
        >
          <Grid
            item
            md
            container
            direction="column"
            spacing={4}
            alignItems="flex-start"
            style={{ textAlign: "justify", flexGrow: 100 }}
          >
            <Grid item>
              <Typography variant="h5" className={classes.questionTitle}>
                Mobilic est-ce que ça fonctionne déjà ?
              </Typography>
              <Typography>
                Oui bien sûr ! Vous pouvez déjà utiliser Mobilic pour
                enregistrer le temps de travail. Le nom de domaine en
                “beta.gouv.fr” indique que Mobilic fait partie des startups
                d'État, des startups publiques développées au sein des
                Ministères publics.
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="h5" className={classes.questionTitle}>
                Dois-je doublonner avec le LIC papier quand j’utilise Mobilic ?
              </Typography>
              <Typography>
                Non ! Mobilic permet de justifier du respect des exigences
                fixées dans les articles R. 3312-19 et R. 3312-58 du code des
                transports. Par ailleurs, dans le secteur du déménagement, un{" "}
                <a
                  href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043023481"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  arrêté spécifique
                </a>{" "}
                permet de justifier du respect du relevé hebdomadaire d’activité
                au moyen de Mobilic par dérogation à la présentation sous forme
                d’un carnet auto-carboné.{" "}
              </Typography>
            </Grid>
          </Grid>
          <Grid item xs className={classes.faqCta}>
            <MainCtaButton
              aria-label="Foire aux questions"
              href="https://faq.mobilic.beta.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
            >
              Consulter la foire aux questions
            </MainCtaButton>
          </Grid>
        </Grid>
      </Container>
    </Container>,
    <Footer key={7} />
  ];
}

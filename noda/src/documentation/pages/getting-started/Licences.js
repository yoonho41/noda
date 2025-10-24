import React from 'react';
import { Row, Col, Breadcrumb, BreadcrumbItem, Table, Container } from 'reactstrap';
import Scrollspy from "../ScrollSpyComponent";

const Licences = () => (
    <Row>
        <Col md={10}>
            <Breadcrumb>
                <BreadcrumbItem>YOU ARE HERE</BreadcrumbItem>
                <BreadcrumbItem>Documentation</BreadcrumbItem>
                <BreadcrumbItem>Getting Started</BreadcrumbItem>
                <BreadcrumbItem active>Licences</BreadcrumbItem>
            </Breadcrumb>
        </Col>
        <Col lg={9}>
            <Container id="Licences" className="my-3">
                <h1>Licences</h1>
                <p className="lead mb-3 mt-3">
                    A license grants you a non-exclusive and non-transferable right to use
                    and incorporate the item in your personal or commercial projects.
                    If your end product including an item is going to be free to the end user then
                    a Single License is what you need. An Extended License is required if the
                    end user must pay to use the end product.
                </p>
                <Table>
                    <thead>
                    <tr>
                        <th/>
                        <th>Single</th>
                        <th>Extended</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td>Hundreds unique components</td>
                        <td className="text-success fw-bold">+</td>
                        <td className="text-success fw-bold">+</td>
                    </tr>
                    <tr>
                        <td>All pages</td>
                        <td className="text-success fw-bold">+</td>
                        <td className="text-success fw-bold">+</td>
                    </tr>
                    <tr>
                        <td>Free Updates</td>
                        <td>3 months</td>
                        <td>6 months</td>
                    </tr>
                    <tr>
                        <td>Paying users allowed</td>
                        <td className="text-danger fw-bold">-</td>
                        <td className="text-success fw-bold">+</td>
                    </tr>
                    </tbody>
                </Table>
            </Container>
            <Container id="Single" className="my-3">
                <h3>Single Application License</h3>
                <p className="lead mt-3 mb-3">
                    Your use of the item is restricted to a single application. You may use the item
                    in work which you are creating for your own purposes or for your client. You must
                    not incorporate the item in a work which is created for redistribution or resale
                    by you or your client. The item may not be redistributed or resold. You may not
                    charge users for using your application.
                </p>
            </Container>
            <Container id="Extended" className="my-3">
                <h3>Extended Application License</h3>
                <p className="lead mt-3 mb-3">
                    Your use of the item is restricted to a single application.
                    You may use the item in work which you are creating for your own
                    purposes or for your clients. You are licensed to use the Item to create one single
                    End Product for yourself or for one client (a “single application”), and the
                    End Product may be Sold and users may be charged for using it (e.g. you are building
                    SAAS application).
                </p>
            </Container>
            <p className="my-2">
                In case if you need any clarifications considering licenses feel free
                to contact us via email: <a className="text-warning" href="mailto:support@flatlogic.com">support@flatlogic.com</a>.
            </p>
        </Col>
        <Col lg={3}>
            <Scrollspy
                title="LICENCES"
                prefix="getting-started/licences"
                ids={[
                    'Licences',
                    'Single',
                    'Extended',
                ]} />
        </Col>
    </Row>
);

export default Licences;
